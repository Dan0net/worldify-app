// 3d/Chunk.ts
import { ChunkMesh } from './ChunkMesh';

export class Chunk {
  x: number;
  y: number;
  z: number;
  meshData: Uint8Array;

  constructor(x: number, y: number, z: number, meshData: Uint8Array) {
    const chunkMesh = new ChunkMesh(meshData);
    this.x = x;
    this.y = y;
    this.z = z;
    this.meshData = meshData;
  }
}