// 3d/Chunk.ts
import { Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from 'three';
import { ChunkData } from '../utils/interfaces';
import { ChunkMesh } from './ChunkMesh';
import { base64ToUint8Array, decompressUint8ToFloat32 } from '../utils/functions';
import { generateMeshWorker } from '../workers/MeshWorkerMultimat';

export class Chunk {
  private mesh: Mesh;

  constructor(private scene: Scene, private chunkData: ChunkData) {
    this.mesh = new ChunkMesh(chunkData);

    this.scene.add(this.mesh);
  }
}