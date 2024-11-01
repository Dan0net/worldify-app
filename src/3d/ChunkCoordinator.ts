// 3d/ChunkCoordinator.ts
import { Chunk } from "./Chunk";
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
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
import { TERRAIN_SCALE, TERRAIN_SIZE } from "../utils/constants";

export class ChunkCoordinator extends Object3D {
  private pendingRequests = new Map<string, Promise<ChunkData>>();
  private api = new API();
  public castableChunkMeshs = new Group();
  public castableCollider: Mesh = new Mesh();

  private bvhVisuliser = new MeshBVHHelper(this.castableCollider, 10);
  private chunks = new Map<string, Chunk>();

  private chunkKeysVisible = new Set<string>();
  private chunkKeysCollidable = new Set<string>();

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
          this.updateVisibleChunks(chunkCoord);
        }
      }
    );

    const { chunkCoord } = usePlayerStore.getState();

    this.createFirstChunk(chunkCoord);
    this.createChunksInRange(chunkCoord);

    // this.add(this.castableChunkMeshs);
    this.add(this.bvhVisuliser);
  }

  private async createFirstChunk(chunkCoord: ChunkCoord) {
    const chunkData = await this.getOrLoadChunk(chunkCoord);

    if (chunkData) {
      this.addChunk(chunkData);
      useGameStore.getState().setHasFirstChunkLoaded(true);
    } else {
      throw new Error("First chunk didnt load, panic!");
    }

    this.updateVisibleChunks(chunkCoord);
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

    this.updateVisibleChunks(baseChunkCoord);
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
        console.log("loading chunk from storage", chunkCoord);
        return existingChunk;
      }
    }

    console.log("requesting chunk from api", chunkCoord);
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
  }

  async updateVisibleChunks(baseCoord: ChunkCoord) {
    let colliderChanged = false;

    const _vec = new Vector3();
    for (const [key, chunk] of this.chunks) {
      const chunkCoord = chunk.chunkCoord;
      _vec.set(
        chunkCoord.x - baseCoord.x,
        chunkCoord.y - baseCoord.y,
        chunkCoord.z - baseCoord.z
      );
      const d = _vec.length();
      if (d < 2) {
        // within collider range
        if (!this.chunkKeysCollidable.has(key)) {
          // add to collider
          this.chunkKeysCollidable.add(key);
          this.castableChunkMeshs.attach(chunk.mesh);
          chunk.copyTemp();
          this.attach(chunk.meshTemp);
          colliderChanged = true;
        }

        if (this.chunkKeysVisible.has(key)) {
          // remove from visible
          this.chunkKeysVisible.delete(key);
          this.remove(chunk.mesh);
        }

        // console.log(key, 'c')
      } else {
        // out of collider range
        if (this.chunkKeysCollidable.has(key)) {
          // remove from collider
          this.chunkKeysCollidable.delete(key);
          this.castableChunkMeshs.remove(chunk.mesh);
          this.remove(chunk.meshTemp);
          colliderChanged = true;
        }

        if (!this.chunkKeysVisible.has(key)) {
          // add to visible
          this.chunkKeysVisible.add(key);
          this.attach(chunk.mesh);
        }
      }
    }

    if (colliderChanged) this.updateCollider();
  }

  updateCollider() {
    console.log("collider update");

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

    this.remove(this.bvhVisuliser);
    this.bvhVisuliser = new MeshBVHHelper(this.castableCollider, 10);
    this.add(this.bvhVisuliser);
    // this.bvhVisuliser.update()
  }

  public drawToChunks(
    center: Vector3,
    inverseRotation: Quaternion,
    bbox: Box3,
    buildConfig: BuildPreset,
    isPlacing = false
  ) {
    const _bbox = bbox.clone();
    _bbox.min.subScalar(1).divideScalar(TERRAIN_SIZE).floor();
    _bbox.max.divideScalar(TERRAIN_SIZE).floor();

    const chunkKeys = new Set<string>();

    chunkKeys.add(
      getChunkKey({ x: _bbox.min.x, y: _bbox.min.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.max.x, y: _bbox.min.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.min.x, y: _bbox.max.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.max.x, y: _bbox.max.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.min.x, y: _bbox.min.y, z: _bbox.max.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.max.x, y: _bbox.min.y, z: _bbox.max.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.min.x, y: _bbox.max.y, z: _bbox.max.z })
    );
    chunkKeys.add(
      getChunkKey({ x: _bbox.max.x, y: _bbox.max.y, z: _bbox.max.z })
    );

    // console.log(chunkKeys.size, chunkKeys)
    let meshChanged = false;
    for (const chunkKey of chunkKeys) {
      const chunk = this.chunks.get(chunkKey);
      if (chunk) {
        const _change = chunk.draw(
          center.clone(),
          inverseRotation,
          bbox.clone(),
          buildConfig,
          isPlacing
        );

        meshChanged = meshChanged || (_change && isPlacing);
      }
    }

    for(const chunkKey of this.chunkKeysCollidable){
      if(!chunkKeys.has(chunkKey)) {
        const chunk = this.chunks.get(chunkKey);
        chunk?.copyTemp();
      }
    }

    if (meshChanged) this.updateCollider();
  }

  dispose() {
    this.unsubPlayerStore();
  }
}
