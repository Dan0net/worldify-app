// builder/BuildPresets.ts
import { BuildShape } from './BuildShape';

export class BuildPresets {
  private presets: Map<string, BuildShape>;

  constructor() {
    this.presets = new Map();
    // Add more presets
  }

  getPreset(name: string): BuildShape | undefined {
    return this.presets.get(name);
  }
}