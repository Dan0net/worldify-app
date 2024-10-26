// 3d/Chunk.ts
import { Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from 'three';
import { ChunkData } from '../utils/interfaces';
import { ChunkMesh } from './ChunkMesh';
import { base64ToUint8Array, decompressUint8ToFloat32 } from '../utils/functions';
import { generateMeshWorker } from '../workers/MeshWorkerMultimat';
import { TERRAIN_SIZE } from '../utils/constants';

export class Chunk {
  private mesh: Mesh;

  constructor(private scene: Scene, private chunkData: ChunkData) {
    this.mesh = new ChunkMesh(chunkData);

    this.mesh.position.set(
      chunkData.x * TERRAIN_SIZE,
      chunkData.y * TERRAIN_SIZE,
      chunkData.z * TERRAIN_SIZE,
    )
    console.log(chunkData.x, chunkData.y, chunkData.z, this.mesh.position)

    this.mesh.updateMatrix();

    this.scene.add(this.mesh);
  }
}