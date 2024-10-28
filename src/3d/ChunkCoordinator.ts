// 3d/ChunkCoordinator.ts
import { Chunk } from './Chunk';
import { Group, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three';
import { useSettingStore } from '../store/SettingStore';
import { useChunkStore } from '../store/ChunkStore';
import { usePlayerStore } from '../store/PlayerStore';
import { API } from '../api/API';
import { ChunkCoord, ChunkData } from '../utils/interfaces';
import { getChunkKey } from '../utils/functions';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';
import { useGameStore } from '../store/GameStore';

export class ChunkCoordinator {
  private pendingRequests = new Map<string, Promise<ChunkData>>();
  private api = new API();
  private chunks = new Map<string, Chunk>();
  public castableChunkMeshs = new Group();
  public castableCollider: Mesh = new Mesh();

  private unsubPlayerStore: () => void;

  constructor(private scene: Scene) {
    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.chunkCoord,
      (chunkCoord, previousChunkCoord) => {
        if (chunkCoord.x !== previousChunkCoord.x || chunkCoord.y !== previousChunkCoord.y || chunkCoord.z !== previousChunkCoord.z) {
          // console.log(chunkCoord, previousChunkCoord);
          this.createChunksInRange(chunkCoord);
        }
      }
    );

    const { chunkCoord } = usePlayerStore.getState();

    this.createFirstChunk(chunkCoord)
    this.createChunksInRange(chunkCoord);

    this.scene.add(this.castableChunkMeshs);
    const visualizer = new MeshBVHHelper(this.castableCollider, 10);
    this.scene.add(visualizer)
  }

  private async getOrLoadChunk(chunkCoord: ChunkCoord): Promise<ChunkData | void> {
    const chunkKey = getChunkKey(chunkCoord);

    if(this.chunks.has(chunkKey) || this.pendingRequests.has(chunkKey)) return Promise.resolve();

    if (Object.keys(useChunkStore.getState().chunks).length > 0) {
      const existingChunk = useChunkStore.getState().chunks.get(chunkKey);
      if (existingChunk) {
        // console.log('loading chunk from storage', chunkCoord)
        return existingChunk;
      }
    }

    // console.log('requesting chunk from api', chunkCoord)
    const chunkPromise = this.api.getChunk(chunkCoord).then((chunkData) => {

      useChunkStore.getState().addChunk(chunkKey, chunkData);

      return chunkData;
    }).finally(() => {
        // Remove from pendingRequests after completion
        this.pendingRequests.delete(chunkKey);
      });

    this.pendingRequests.set(chunkKey, chunkPromise);

    return await chunkPromise;
  }

  private async createFirstChunk(chunkCoord: ChunkCoord) {
    const chunkData = await this.getOrLoadChunk(chunkCoord);

    if(chunkData) {
      this.addChunk(chunkData)
      useGameStore.getState().setHasFirstChunkLoaded(true);
    } else {
      throw new Error('First chunk didnt load, panic!');
    }
  }

  private async createChunksInRange(baseChunkCoord: ChunkCoord) {
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
        if(chunkData) this.addChunk(chunkData)
      }
    }
  }

  private addChunk(chunkData: ChunkData) {
    const chunkKey = getChunkKey({ x: chunkData.x, y: chunkData.y, z: chunkData.z });
    // console.log('adding ', chunkKey)

    const chunk = new Chunk(this.scene, chunkData);
    this.chunks.set(chunkKey, chunk);

    this.castableChunkMeshs.attach(chunk.mesh);
    // this.scene.add(chunk.mesh);

    this.updateCollider();
  }

  async updateCollider() {
    const staticGenerator = new StaticGeometryGenerator(this.castableChunkMeshs);
    staticGenerator.attributes = ['position'];
    staticGenerator.applyWorldTransforms = true;

    const mergedGeometry = staticGenerator.generate();
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

    const mat = new MeshStandardMaterial();
    this.castableCollider = new Mesh(mergedGeometry, mat);
    mat.wireframe = true;
    mat.opacity = 0.5;
    mat.transparent = true;
    mat.needsUpdate = true;
  }

  dispose() {
    this.unsubPlayerStore();
  }
}