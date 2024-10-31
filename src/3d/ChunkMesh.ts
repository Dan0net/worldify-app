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
  decompressUint8ToFloat32,
} from "../utils/functions";
import { generateMeshWorker } from "../workers/MeshWorkerMultimat";
import { TerrainMaterial } from "../material/TerrainMaterial";
import { TERRAIN_GRID_SIZE_MARGIN, TERRAIN_SCALE } from "../utils/constants";

export class ChunkMesh extends Mesh {
  private meshData;

  constructor() {
    super(new BufferGeometry(), TerrainMaterial.getInstance());

    this.castShadow = true;
    this.receiveShadow = true;
  }

  generateMeshData(grid: Float32Array) {
    this.meshData = generateMeshWorker(
      grid,
      {
        x: TERRAIN_GRID_SIZE_MARGIN,
        y: TERRAIN_GRID_SIZE_MARGIN,
        z: TERRAIN_GRID_SIZE_MARGIN,
      },
      new Float32Array(grid).fill(1),
      new Float32Array(),
      new Float32Array(grid).fill(0)
    );
  }

  updateMesh() {
    if (!this.meshData) return;

    this.geometry.dispose();
    // console.log(data)
    // console.log('aaa')

    const { indices, vertices, adjusted, bary, light, lightIndices, normal } =
      this.meshData;

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
}
