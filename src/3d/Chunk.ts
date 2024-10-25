// 3d/Chunk.ts
import { Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from 'three';
import { ChunkData } from '../utils/interfaces';
import { ChunkMesh } from './ChunkMesh';
import { base64ToUint8Array, decompressUint8ToFloat32 } from '../utils/functions';

export class Chunk {
  private mesh: Mesh;

  constructor(private scene: Scene, private chunkData: ChunkData) {
    const gridUint8 = base64ToUint8Array(chunkData.grid);
    const gridFloat32 = decompressUint8ToFloat32(gridUint8);

    console.log(gridFloat32);

    const geometry = new PlaneGeometry(4, 4, 4);
    const material = new MeshStandardMaterial({ color: 0x0077ff });
    this.mesh = new Mesh(geometry, material);
    scene.add(this.mesh);
  }
}