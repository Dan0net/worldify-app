// 3d/ChunkMesh.ts

import { BufferGeometry } from "three";
// import { TerrainMaterial } from "../material/TerrainMaterial";

export class ChunkMesh {
  geometry: BufferGeometry;
  // material: TerrainMaterial;

  constructor(voxelData: Uint8Array) {
    this.geometry = new BufferGeometry();
    // this.material = new TerrainMaterial(/* texture array */);
    this.generateMesh(voxelData);
  }

  private generateMesh(voxelData: Uint8Array) {
    // Use a worker to generate geometry from voxel data
  }
}