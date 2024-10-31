// 3d/Chunk.ts
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";
import { ChunkData } from "../utils/interfaces";
import { ChunkMesh } from "./ChunkMesh";
import {
  base64ToUint8Array,
  decompressUint8ToFloat32,
  worldToChunkPosition,
} from "../utils/functions";
import { generateMeshWorker } from "../workers/MeshWorkerMultimat";
import { TERRAIN_SCALE, TERRAIN_SIZE } from "../utils/constants";
import { BuildPreset } from "../builder/BuildPresets";

export class Chunk extends Object3D {
  private grid: Float32Array;
  private gridTemp: Float32Array | null = null;
  public mesh: ChunkMesh;
  public meshTemp: ChunkMesh | null = null;

  constructor(private chunkData: ChunkData) {
    super();

    this.mesh = new ChunkMesh();

    this.grid = this.readChunkGridData(chunkData);
    this.mesh.generateMeshData(this.grid);
    this.mesh.updateMesh();
    this.add(this.mesh);

    this.scale.set(TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);

    this.position.set(
      chunkData.x * TERRAIN_SIZE,
      chunkData.y * TERRAIN_SIZE,
      chunkData.z * TERRAIN_SIZE
    );

    this.updateMatrix();
  }

  readChunkGridData(chunkData: ChunkData) {
    const gridUint8 = base64ToUint8Array(chunkData.grid);
    return decompressUint8ToFloat32(gridUint8);
  }

  public draw(
    center: Vector3,
    bbox: Box3,
    buildConfig: BuildPreset,
    isPlacing = false
  ) {
    worldToChunkPosition(center, this.position);
    worldToChunkPosition(bbox.min, this.position);
    worldToChunkPosition(bbox.max, this.position);
    
    if (!isPlacing) {
      if (!this.meshTemp) this.meshTemp = new ChunkMesh();
      if (!this.gridTemp) this.gridTemp = new Float32Array(this.grid);
    }
  }
}
