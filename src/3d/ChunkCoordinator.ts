// 3d/ChunkCoordinator.ts
import { Chunk } from './Chunk';
import { Scene, Vector3 } from 'three';
import { useSettingStore } from '../store/SettingStore';
import { useChunkStore } from '../store/ChunkStore';
import { usePlayerStore } from '../store/PlayerStore';
import { API } from '../api/API';
import { ChunkCoord, ChunkData } from '../utils/interfaces';
import { getChunkKey } from '../utils/functions';

export class ChunkCoordinator {
  private pendingRequests = new Map<string, Promise<ChunkData>>();
  private api = new API();
  private chunks = new Map<string, Chunk>();

  private unsubPlayerStore: () => void;

  constructor(private scene: Scene) {
    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.chunkCoord,
      (chunkCoord, previousChunkCoord) => {
        if (chunkCoord !== previousChunkCoord) this.updateChunksInViewRange(chunkCoord);
      }
    );

    const { chunkCoord } = usePlayerStore.getState();
    this.updateFirstInitialChunk(chunkCoord);
  }

  private async getOrLoadChunk(chunkCoord: ChunkCoord): Promise<ChunkData> {
    const chunkKey = getChunkKey(chunkCoord);
    if (Object.keys(useChunkStore.getState().chunks).length > 0) {
      const existingChunk = useChunkStore.getState().chunks.get(chunkKey);
      if (existingChunk) {
        console.log('loading chunk from storage', chunkCoord)
        return existingChunk;
      }
    }

    if (this.pendingRequests.has(chunkKey)) {
      console.log('chunk request already pending', chunkCoord)
      return await this.pendingRequests.get(chunkKey)!;
    }
    
    console.log('requesting chunk from api', chunkCoord)
    const chunkPromise = this.api.getChunk(chunkCoord).then((chunkData) => {

      useChunkStore.getState().addChunk(chunkKey, chunkData);

      return chunkData;
    })
      .finally(() => {
        // Remove from pendingRequests after completion
        this.pendingRequests.delete(chunkKey);
      });

    this.pendingRequests.set(chunkKey, chunkPromise);

    return await chunkPromise;
  }

  private async updateFirstInitialChunk(chunkCoord: ChunkCoord) {
    const chunkData = await this.getOrLoadChunk(chunkCoord);
    const chunkKey = getChunkKey(chunkCoord);

    this.chunks.set(chunkKey, new Chunk(this.scene, chunkData));
  }

  private async updateChunksInViewRange(baseChunkCoord: ChunkCoord) {
    const { viewDistance } = useSettingStore.getState();

    const chunksToLoad: ChunkCoord[] = [];

    for (let x = -viewDistance; x < viewDistance * 2; x++) {
      for (let z = -viewDistance; z < viewDistance * 2; z++) {
        chunksToLoad.push({
          x: baseChunkCoord.x + x,
          y: baseChunkCoord.y,
          z: baseChunkCoord.z + z,
        });
      }

      const chunkPromises = chunksToLoad.map((chunkCoords) => this.getOrLoadChunk(chunkCoords));

      const chunkDatas = await Promise.all(chunkPromises);

      // Add chunks to scene
      for (const chunkData of chunkDatas) {
        const chunkCoord = getChunkKey({x: chunkData.x, y: chunkData.y, z: chunkData.z});

        this.chunks.set(chunkCoord, new Chunk(this.scene, chunkData));

        console.log(chunkCoord);
        // if (!this.scene.getObjectByName(chunk.mesh.name)) {
        //   this.scene.add(chunk.mesh);
        // }
      }

      // this.unloadFarChunks(playerChunkCoord, viewDistance);
    }

    // console.log(gridUint8, gridFloat32);
  }

  // private async loadChunk(x: number, y: number, z: number) {
  //   const key = `${x}-${y}-${z}`;
  //   if (this.chunks.has(key)) return;
  //   // const voxelData = await this.api.getChunk(x, y, z);
  //   // const chunk = new Chunk(x, y, z, voxelData);
  //   // chunk.addToScene(this.scene);
  //   // this.chunks.set(key, chunk);
  //   useChunkStore.setState((state) => ({
  //     // chunks: new Map(state.chunks).set(key, chunk),
  //   }));
  // }

  dispose() {
    this.unsubPlayerStore();
  }
}