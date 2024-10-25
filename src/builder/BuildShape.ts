export interface BuildShape {
    draw(voxelData: Uint8Array, position: { x: number; y: number; z: number }): void;
  }