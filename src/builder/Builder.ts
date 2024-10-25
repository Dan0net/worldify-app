// builder/Builder.ts
import { usePlayerStore } from '../store/PlayerStore';
import { BuildPresets } from './BuildPresets';
import { Scene } from 'three';

export class Builder {
  private buildPresets: BuildPresets;

  constructor(private scene: Scene) {
    this.buildPresets = new BuildPresets();
  }

  build() {
    const { buildPreset } = usePlayerStore.getState();
    const preset = this.buildPresets.getPreset(buildPreset);
    if (preset) {
      // Use raycasting to determine where to build
      const position = this.getBuildPosition();
      // Modify voxel data
    //   preset.draw(/* voxelData */, position);
      // Update chunk mesh
    }
  }

  private getBuildPosition(): { x: number; y: number; z: number } {
    // Implement raycasting logic
    return { x: 0, y: 0, z: 0 };
  }
}