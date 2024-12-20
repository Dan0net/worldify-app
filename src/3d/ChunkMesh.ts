// 3d/Chunk.ts
import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
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

const solidMaterial =  TerrainMaterial.getInstance();
const transparentMaterial =  TerrainMaterial.getTransparentInstance();

export class ChunkMesh extends Group {
  private data;
  public weights = new Float32Array();
  public materials = new Float32Array();
  public lights = new Float32Array();

  public solid = new Mesh(new BufferGeometry(), solidMaterial);
  public liquid = new Mesh(
    new BufferGeometry(),
    transparentMaterial
  );

  public transparent = new Mesh(
    new BufferGeometry(),
    transparentMaterial
  );

  constructor() {
    super();

    this.solid.castShadow = true;
    this.solid.receiveShadow = true;
    this.add(this.solid);

    this.liquid.castShadow = false;
    this.liquid.receiveShadow = true;
    this.add(this.liquid);

    this.transparent.castShadow = true;
    this.transparent.receiveShadow = true;
    this.add(this.transparent);
  }

  //  88                                    88
  //  88                                    88
  //  88                                    88
  //  88   ,adPPYba,   ,adPPYYba,   ,adPPYb,88
  //  88  a8"     "8a  ""     `Y8  a8"    `Y88
  //  88  8b       d8  ,adPPPPP88  8b       88
  //  88  "8a,   ,a8"  88,    ,88  "8a,   ,d88
  //  88   `"YbbdP"'   `"8bbdP"Y8   `"8bbdP"Y8

  readSolidGridFromString(chunkData: ChunkData) {
    const _grid = base64ToUint16Array(chunkData.grid);
    // console.log(_grid);
    const grid = unpackGridArray(_grid);

    this.weights = decompressUint8ToFloat32(grid.weights, -0.5, 0.5, 5);
    this.materials = new Float32Array(grid.materials);
    this.lights = new Float32Array(grid.lights);

    // for (let i = 0; i < this.materials.length; i++) {
    //   if (this.materials[i] == 47) this.weights[i] = -0.001;
    // }
  }

  // readLiquidGridFromString(chunkData: ChunkData) {
  //   const _grid = base64ToUint16Array(chunkData.grid);
  //   // console.log(_grid);
  //   const grid = unpackGridArray(_grid);

  //   this.weights = decompressUint8ToFloat32(grid.weights, -0.5, 0.5, 5);
  //   this.materials = new Float32Array(grid.materials);
  //   this.lights = new Float32Array(grid.lights);

  //   // for (let i = 0; i < this.materials.length; i++) {
  //   //   if (this.materials[i] != 47 && this.weights[i] > 0)
  //   //     this.weights[i] = -0.001;
  //   // }
  // }

  copyGridFromChunkMesh(chunkMesh: ChunkMesh) {
    this.weights = new Float32Array(chunkMesh.weights);
    this.materials = new Float32Array(chunkMesh.materials);
    this.lights = new Float32Array(chunkMesh.materials);
  }

  copyGeometryFromChunkMesh(chunkMesh: ChunkMesh) {
    this.solid.geometry = chunkMesh.solid.geometry;
    this.liquid.geometry = chunkMesh.liquid.geometry;
    this.transparent.geometry = chunkMesh.transparent.geometry;
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
      materials: this.materials,
      lightIncidents: new Float32Array(),
      lightIndices: new Float32Array(this.weights).fill(0),
    };

    // const data = await workerPool.enqueueTask(req);

    // TODO make these happen in paralell in surfacenets algo
    // TODO ignore meshes that don't have info early on, before surfacenet algo

    const solidData = generateMeshWorker(
      req.grid,
      req.gridSize,
      req.materials,
      [0, 46],
      req.lightIncidents,
      req.lightIndices
    );

    this.updateMesh(this.solid, solidData);

    const liquidData = generateMeshWorker(
      req.grid,
      req.gridSize,
      req.materials,
      [47, 47],
      req.lightIncidents,
      req.lightIndices
    );

    this.updateMesh(this.liquid, liquidData);

    const transparentData = generateMeshWorker(
      req.grid,
      req.gridSize,
      req.materials,
      [48, 49],
      req.lightIncidents,
      req.lightIndices
    );

    this.updateMesh(this.transparent, transparentData);
  }

  updateMesh(_mesh: Mesh, data) {
    // TODO set usage type of bufferattributes if the draw is main mesh, or temp mesh
    //     STATIC: The user will set the data once.
    // DYNAMIC: The user will set the data occasionally.
    // STREAM: The user will be changing the data after every use. Or almost every use.

    // TODO check if bufferatrtributes are big enough before calling dispose on geometry to reuse exisiting buffers
    // ie. if new buffer is smaller

    _mesh.geometry.dispose();

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

    buffer.computeBoundsTree(); // todo calc only when in range

    _mesh.geometry = buffer;
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

  //                          88  88  8b           d8            88
  //                          88  88  `8b         d8'            88
  //                          88  88   `8b       d8'             88
  //   ,adPPYba,   ,adPPYba,  88  88    `8b     d8'  ,adPPYYba,  88  88       88   ,adPPYba,
  //  a8"     ""  a8P_____88  88  88     `8b   d8'   ""     `Y8  88  88       88  a8P_____88
  //  8b          8PP"""""""  88  88      `8b d8'    ,adPPPPP88  88  88       88  8PP"""""""
  //  "8a,   ,aa  "8b,   ,aa  88  88       `888'     88,    ,88  88  "8a,   ,a88  "8b,   ,aa
  //   `"Ybbd8"'   `"Ybbd8"'  88  88        `8'      `"8bbdP"Y8  88   `"YbbdP'Y8   `"Ybbd8"'

  getCellType(gridIndex: number) {
    return this.materials[gridIndex];
  }
}
