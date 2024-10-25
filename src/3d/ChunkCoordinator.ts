// 3d/ChunkCoordinator.ts
import { Chunk } from './Chunk';
import { Scene, Vector3 } from 'three';
import { useSettingStore } from '../store/SettingStore';
import { useChunkStore } from '../store/ChunkStore';

export class ChunkCoordinator {
  private chunks: Map<string, Chunk> = new Map();

  constructor(private scene: Scene) {}

  async updateChunksAroundPlayer(position: Vector3) {
    const { viewDistance } = useSettingStore.getState();
    // Calculate which chunks to load based on viewDistance and player position
    // Load new chunks and remove distant ones
  }

  private async loadChunk(x: number, y: number, z: number) {
    const key = `${x}-${y}-${z}`;
    if (this.chunks.has(key)) return;
    // const voxelData = await this.api.getChunk(x, y, z);
    // const chunk = new Chunk(x, y, z, voxelData);
    // chunk.addToScene(this.scene);
    // this.chunks.set(key, chunk);
    useChunkStore.setState((state) => ({
      // chunks: new Map(state.chunks).set(key, chunk),
    }));
  }
}