// 3d/Chunk.ts
import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
} from "three";
import { ChunkData } from "../utils/interfaces";
import {
  base64ToUint8Array,
  clamp,
  compressFloat32ArrayToUint8,
  decompressUint8ToFloat32,
  arrayToBase64,
  base64ToUint16Array,
  packGridArray,
  unpackGridArray,
} from "../utils/functions";
import { generateMeshWorker } from "../workers/MeshWorkerMultimat";
import { TerrainMaterial } from "../material/TerrainMaterial";
import { TERRAIN_GRID_SIZE_MARGIN, TERRAIN_SCALE } from "../utils/constants";
import { getChunkWorkerPool } from "../workers/ChunkWorkerPool";
import { BuildPreset } from "../builder/BuildPresets";

export class ChunkMesh extends Mesh {
  private data;
  public weights = new Float32Array();
  public materials = new Float32Array();
  public lights = new Float32Array();

  constructor() {
    super(new BufferGeometry(), TerrainMaterial.getInstance());

    this.castShadow = true;
    this.receiveShadow = true;
  }

  //  88                                    88
  //  88                                    88
  //  88                                    88
  //  88   ,adPPYba,   ,adPPYYba,   ,adPPYb,88
  //  88  a8"     "8a  ""     `Y8  a8"    `Y88
  //  88  8b       d8  ,adPPPPP88  8b       88
  //  88  "8a,   ,a8"  88,    ,88  "8a,   ,d88
  //  88   `"YbbdP"'   `"8bbdP"Y8   `"8bbdP"Y8

  readGridFromString(chunkData: ChunkData) {
    const _grid = base64ToUint16Array(chunkData.grid);
    // console.log(_grid);
    const grid = unpackGridArray(_grid);

    this.weights = decompressUint8ToFloat32(grid.weights, -0.5, 0.5, 5);
    this.materials = new Float32Array(grid.materials);
    this.lights = new Float32Array(grid.lights);

    // console.log(this.weights[0], this.weights[30000]);
    // console.log(this.materials[0], this.materials[30000]);
    // console.log(this.lights[0], this.lights[30000]);
  }

  copyGridFromChunkMesh(chunkMesh: ChunkMesh) {
    this.weights = new Float32Array(chunkMesh.weights);
    this.materials = new Float32Array(chunkMesh.materials);
    this.lights = new Float32Array(chunkMesh.materials);
  }

  gridToString(): string {
    const _weights = compressFloat32ArrayToUint8(this.weights, -0.5, 0.5, 5);

    const grid = packGridArray(
      _weights,
      new Uint8Array(this.materials),
      new Uint8Array(this.lights)
    );
    return arrayToBase64(grid);
  }

  //                                     88
  //                                     88                ,d
  //                                     88                88
  //  88       88  8b,dPPYba,    ,adPPYb,88  ,adPPYYba,  MM88MMM  ,adPPYba,
  //  88       88  88P'    "8a  a8"    `Y88  ""     `Y8    88    a8P_____88
  //  88       88  88       d8  8b       88  ,adPPPPP88    88    8PP"""""""
  //  "8a,   ,a88  88b,   ,a8"  "8a,   ,d88  88,    ,88    88,   "8b,   ,aa
  //   `"YbbdP'Y8  88`YbbdP"'    `"8bbdP"Y8  `"8bbdP"Y8    "Y888  `"Ybbd8"'
  //               88
  //               88

  async generateMeshData() {
    const workerPool = getChunkWorkerPool();

    const req = {
      grid: this.weights,
      gridSize: {
        x: TERRAIN_GRID_SIZE_MARGIN,
        y: TERRAIN_GRID_SIZE_MARGIN,
        z: TERRAIN_GRID_SIZE_MARGIN,
      },
      adjustedIndices: this.materials,
      lightIncidents: new Float32Array(),
      lightIndices: new Float32Array(this.weights).fill(0),
    };

    // const data = await workerPool.enqueueTask(req);

    const data = generateMeshWorker(
      req.grid,
      req.gridSize,
      req.adjustedIndices,
      req.lightIncidents,
      req.lightIndices
    );

    this.updateMesh(data);
  }

  updateMesh(data) {
    this.geometry.dispose();

    const { indices, vertices, adjusted, bary, light, lightIndices, normal } =
      data;

    this.data = data;

    // return new PlaneGeometry(32,32,32);

    // if ( indices.length === 0 ) return;

    //create new geometry
    const buffer = new BufferGeometry();

    const indexBufferAttribute = new BufferAttribute(indices, 1);
    buffer.setIndex(indexBufferAttribute);
    indexBufferAttribute.needsUpdate = true;

    const positionBufferAttribute = new Float32BufferAttribute(vertices, 3);
    buffer.setAttribute("position", positionBufferAttribute);
    positionBufferAttribute.needsUpdate = true;

    const adjustedBufferAttribute = new BufferAttribute(adjusted, 3);
    buffer.setAttribute("adjusted", adjustedBufferAttribute);
    adjustedBufferAttribute.needsUpdate = true;

    const baryBufferAttribute = new BufferAttribute(bary, 3);
    buffer.setAttribute("bary", baryBufferAttribute);
    baryBufferAttribute.needsUpdate = true;

    const lightBufferAttribute = new BufferAttribute(light, 1);
    buffer.setAttribute("light", lightBufferAttribute);
    lightBufferAttribute.needsUpdate = true;

    // this.lightIndices = lightIndices;

    const normalBufferAttribute = new BufferAttribute(normal, 3);
    buffer.setAttribute("normal", normalBufferAttribute);
    normalBufferAttribute.needsUpdate = true;
    // buffer.computeVertexNormals();

    // meshObjs.indices.set(indices)

    // meshObjs.vertices.set(vertices)

    // meshObjs.adjusted.set(adjusted)

    buffer.computeBoundsTree();

    this.geometry = buffer;
  }

  //           88
  //           88
  //           88
  //   ,adPPYb,88  8b,dPPYba,  ,adPPYYba,  8b      db      d8
  //  a8"    `Y88  88P'   "Y8  ""     `Y8  `8b    d88b    d8'
  //  8b       88  88          ,adPPPPP88   `8b  d8'`8b  d8'
  //  "8a,   ,d88  88          88,    ,88    `8bd8'  `8bd8'
  //   `"8bbdP"Y8  88          `"8bbdP"Y8      YP      YP

  addValueToGrid(
    gridIndex: number,
    v: number,
    buildConfig: BuildPreset
  ): boolean {
    v = clamp(v, -0.5, 0.5);
    // console.log(gridIndex, this.grid[Math.floor(gridIndex)])

    if (
      buildConfig.constructive &&
      ((v > this.weights[gridIndex] && v > 0) ||
        this.weights[gridIndex] === -0.5)
    ) {
      this.weights[gridIndex] = v;
      this.materials[gridIndex] = buildConfig.material;
      return true;
    }

    if (!buildConfig.constructive && v < this.weights[gridIndex]) {
      this.weights[gridIndex] = v;
      return true;
    }

    return false;
  }
}
