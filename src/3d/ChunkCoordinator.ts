// 3d/ChunkCoordinator.ts
import { Chunk } from "./Chunk";
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  Vector3,
} from "three";
import { useSettingStore } from "../store/SettingStore";
import { useChunkStore } from "../store/ChunkStore";
import { usePlayerStore } from "../store/PlayerStore";
import { API } from "../api/API";
import { ChunkCoord, ChunkData } from "../utils/interfaces";
import { getChunkKey } from "../utils/functions";
import {
  MeshBVH,
  MeshBVHHelper,
  StaticGeometryGenerator,
} from "three-mesh-bvh";
import { useGameStore } from "../store/GameStore";
import { BuildPreset } from "../builder/BuildPresets";
import { TERRAIN_SIZE } from "../utils/constants";

export class ChunkCoordinator extends Object3D {
  private pendingRequests = new Map<string, Promise<ChunkData>>();
  private api = new API();
  public castableChunkMeshs = new Group();
  public castableCollider: Mesh = new Mesh();
  
  private chunks = new Map<string, Chunk>();

  private unsubPlayerStore: () => void;

  constructor() {
    super();

    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.chunkCoord,
      (chunkCoord, previousChunkCoord) => {
        if (
          chunkCoord.x !== previousChunkCoord.x ||
          chunkCoord.y !== previousChunkCoord.y ||
          chunkCoord.z !== previousChunkCoord.z
        ) {
          // console.log(chunkCoord, previousChunkCoord);
          this.createChunksInRange(chunkCoord);
        }
      }
    );

    const { chunkCoord } = usePlayerStore.getState();

    this.createFirstChunk(chunkCoord);
    this.createChunksInRange(chunkCoord);

    this.add(this.castableChunkMeshs);
    const visualizer = new MeshBVHHelper(this.castableCollider, 10);
    this.add(visualizer);
  }

  private async createFirstChunk(chunkCoord: ChunkCoord) {
    const chunkData = await this.getOrLoadChunk(chunkCoord);

    if (chunkData) {
      this.addChunk(chunkData);
      useGameStore.getState().setHasFirstChunkLoaded(true);
    } else {
      throw new Error("First chunk didnt load, panic!");
    }
  }

  private async createChunksInRange(baseChunkCoord: ChunkCoord) {
    const { viewDistance } = useSettingStore.getState();

    const chunksToLoad: ChunkCoord[] = [];

    for (let x = -viewDistance; x <= viewDistance; x++) {
      for (let z = -viewDistance; z <= viewDistance; z++) {
        chunksToLoad.push({
          x: baseChunkCoord.x + x,
          y: baseChunkCoord.y,
          z: baseChunkCoord.z + z,
        });
      }

      const chunkPromises = chunksToLoad.map((chunkCoords) =>
        this.getOrLoadChunk(chunkCoords)
      );

      const chunkDatas = await Promise.all(chunkPromises);

      // Add chunks to scene
      for (const chunkData of chunkDatas) {
        if (chunkData) this.addChunk(chunkData);
      }
    }
  }

  private async getOrLoadChunk(
    chunkCoord: ChunkCoord
  ): Promise<ChunkData | void> {
    const chunkKey = getChunkKey(chunkCoord);

    if (this.chunks.has(chunkKey) || this.pendingRequests.has(chunkKey))
      return Promise.resolve();

    const chunkDatas = useChunkStore.getState().chunkData;
    // console.log(chunkKey, Object.keys(chunkDatas))
    if (chunkKey in chunkDatas) {
    const existingChunk = chunkDatas[chunkKey];
      if (existingChunk) {
        console.log('loading chunk from storage', chunkCoord)
        return existingChunk;
      }
    }

    console.log('requesting chunk from api', chunkCoord)
    const chunkPromise = this.api
      .getChunk(chunkCoord)
      .then((chunkData) => {
        useChunkStore.getState().addChunkData(chunkKey, chunkData);

        return chunkData;
      })
      .finally(() => {
        // Remove from pendingRequests after completion
        this.pendingRequests.delete(chunkKey);
      });

    this.pendingRequests.set(chunkKey, chunkPromise);

    return await chunkPromise;
  }

  private addChunk(chunkData: ChunkData) {
    const chunkKey = getChunkKey({
      x: chunkData.x,
      y: chunkData.y,
      z: chunkData.z,
    });
    // console.log('adding ', chunkKey)

    const chunk = new Chunk(chunkData);
    this.chunks.set(chunkKey, chunk);

    this.castableChunkMeshs.attach(chunk);
    // this.scene.add(chunk.mesh);

    this.updateCollider();
  }

  async updateCollider() {
    const staticGenerator = new StaticGeometryGenerator(
      this.castableChunkMeshs
    );
    staticGenerator.attributes = ["position"];
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

  public drawToChunks(
    center: Vector3,
    bbox: Box3,
    buildConfig: BuildPreset,
    isPlacing = false
  ) {
    const _bbox = bbox.clone()
    _bbox.min.divideScalar(TERRAIN_SIZE).floor();
    _bbox.max.divideScalar(TERRAIN_SIZE).floor();

    const chunkKeys = new Set<string>();

    chunkKeys.add(getChunkKey({ x: _bbox.min.x, y: _bbox.min.y, z: _bbox.min.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.max.x, y: _bbox.min.y, z: _bbox.min.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.min.x, y: _bbox.max.y, z: _bbox.min.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.max.x, y: _bbox.max.y, z: _bbox.min.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.min.x, y: _bbox.min.y, z: _bbox.max.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.max.x, y: _bbox.min.y, z: _bbox.max.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.min.x, y: _bbox.max.y, z: _bbox.max.z }));
    chunkKeys.add(getChunkKey({ x: _bbox.max.x, y: _bbox.max.y, z: _bbox.max.z }));

    console.log(chunkKeys.size, chunkKeys)

    for (const chunkKey in chunkKeys) {
      const chunk = this.chunks.get(chunkKey)
      if (chunk) chunk.draw(center, bbox.clone(), buildConfig, isPlacing);
    }
  }

  dispose() {
    this.unsubPlayerStore();
  }
}
