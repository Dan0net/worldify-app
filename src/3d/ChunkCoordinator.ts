// 3d/ChunkCoordinator.ts
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3
} from "three";
import {
  MeshBVH,
  MeshBVHHelper,
  StaticGeometryGenerator,
} from "three-mesh-bvh";
import { API } from "../api/API";
import { BuildPreset } from "../builder/BuildPresets";
import { useChunkStore } from "../store/ChunkStore";
import { useGameStore } from "../store/GameStore";
import { usePlayerStore } from "../store/PlayerStore";
import { useSettingStore } from "../store/SettingStore";
import { TERRAIN_SIZE } from "../utils/constants";
import { chunkCoordsToKey } from "../utils/functions";
import { ChunkCoord, ChunkData } from "../utils/interfaces";
import { Chunk } from "./Chunk";

export class ChunkCoordinator extends Object3D {
  private pendingRequests = new Map<string, Promise<ChunkData>>();
  private api = new API();
  public castableChunkMeshs = new Group();
  public castableCollider: Mesh = new Mesh();

  private bvhVisuliser = new MeshBVHHelper(this.castableCollider, 10);
  private chunks = new Map<string, Chunk>();

  private chunkKeysVisible = new Set<string>();
  private chunkKeysCollidable = new Set<string>();

  private chunkKeysToPost = new Set<string>();

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
        for (let y = -viewDistance; y <= viewDistance; y++) {
          chunksToLoad.push({
            x: baseChunkCoord.x + x,
            y: baseChunkCoord.y + y,
            z: baseChunkCoord.z + z,
          });
        }
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
    const chunkKey = chunkCoordsToKey(chunkCoord);

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
    const chunkKey = chunkCoordsToKey({
      x: chunkData.x,
      y: chunkData.y,
      z: chunkData.z,
    });
    // console.log('adding ', chunkKey)

    useChunkStore.getState().addChunkData(chunkKey, chunkData);

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
      chunkCoordsToKey({ x: _bbox.min.x, y: _bbox.min.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.max.x, y: _bbox.min.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.min.x, y: _bbox.max.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.max.x, y: _bbox.max.y, z: _bbox.min.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.min.x, y: _bbox.min.y, z: _bbox.max.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.max.x, y: _bbox.min.y, z: _bbox.max.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.min.x, y: _bbox.max.y, z: _bbox.max.z })
    );
    chunkKeys.add(
      chunkCoordsToKey({ x: _bbox.max.x, y: _bbox.max.y, z: _bbox.max.z })
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

        if (_change && isPlacing) {
          this.saveChunk(chunk);
        }
      }
    }

    for (const chunkKey of this.chunkKeysCollidable) {
      if (!chunkKeys.has(chunkKey)) {
        const chunk = this.chunks.get(chunkKey);
        chunk?.copyTemp();
      }
    }

    if (meshChanged) this.updateCollider();
  }

  saveChunk(chunk: Chunk) {
    const chunkKey = chunk.chunkKey;
    const chunkData = chunk.toChunkData();

    useChunkStore.getState().addChunkData(chunkKey, chunkData);
    // this.chunkKeysToPost.add(chunkKey);
    const chunkCoord = chunk.chunkCoord;
    const grid = chunkData.grid;

    this.api
      .postChunk(chunkCoord, grid)
      .then((chunkData) => {
        console.log(chunkData);
      })
      .finally(() => {
        // Remove from pendingRequests after completion
        // this.pendingRequests.delete(chunkKey);
      });
  }

  dispose() {
    this.unsubPlayerStore();
  }
}
