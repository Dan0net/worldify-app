// 3d/ChunkCoordinator.ts
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  RGBA_ASTC_10x5_Format,
  Vector3,
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
import {
  CHUNK_RENDER_DELAY_MS,
  CHUNKS_MAX_REQUEST,
  TERRAIN_SIZE,
  VIEW_DISTANCE_MAX,
} from "../utils/constants";
import { chunkCoordsToKey, chunkCoordsToSurfaceKey } from "../utils/functions";
import { ChunkCoord, ChunkData } from "../utils/interfaces";
import { Chunk } from "./Chunk";
import { InputController } from "../input/InputController";

export class ChunkCoordinator extends Object3D {
  private pendingRequests = new Map<string, Promise<ChunkData>>();
  private api = new API();
  public castableChunkMeshs = new Group();
  public castableCollider: Mesh = new Mesh();

  private bvhVisuliser = new MeshBVHHelper(this.castableCollider, 10);
  private chunks = new Map<string, Chunk>();

  private chunkKeysVisible = new Set<string>();
  private chunkKeysCollidable = new Set<string>();
  private chunkRenderQueue: Chunk[] = [];
  private chunkRendering = false;
  private chunkRenderTimer: ReturnType<typeof setTimeout> | null = null;

  private debug = false;
  private unsubPlayerStore: () => void;

  private _chunkCoord: ChunkCoord;

  private requestedSurfaceChunkCoords = new Set<string>();
  private requestedChunkCoords = new Set<string>();

  private forceRegenerateChunks = false;

  constructor(private inputController: InputController) {
    super();

    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.chunkCoord,
      (chunkCoord, previousChunkCoord) => {
        if (chunkCoord !== this._chunkCoord) {
          // console.log(
          //   "updated player chunk coord",
          //   chunkCoord,
          //   previousChunkCoord
          // );
          this._chunkCoord = chunkCoord;
          this.loadSurfaceChunks();
          this.loadChunksInRange();
          this.updateVisibleChunks();
        }
      }
    );

    const { chunkCoord } = usePlayerStore.getState();

    this._chunkCoord = chunkCoord;
    this.loadFirstSurfaceChunks();

    this.add(this.bvhVisuliser);

    this.inputController.on("input", this.handleInput);
  }

  handleInput = (event) => {
    switch (event.key_func_name) {
      case "debug":
        this.toggleDebug();
        break;
    }
  };

  toggleDebug() {
    this.debug = !this.debug;

    this.bvhVisuliser.visible = this.debug;
  }

  //  88                                    88
  //  88                                    88
  //  88                                    88
  //  88   ,adPPYba,   ,adPPYYba,   ,adPPYb,88
  //  88  a8"     "8a  ""     `Y8  a8"    `Y88
  //  88  8b       d8  ,adPPPPP88  8b       88
  //  88  "8a,   ,a8"  88,    ,88  "8a,   ,d88
  //  88   `"YbbdP"'   `"8bbdP"Y8   `"8bbdP"Y8

  private async loadFirstSurfaceChunks() {
    console.log("creating first chunk", this._chunkCoord);

    const yCoordMax = await this.loadSurfaceChunks();

    if (yCoordMax) {
      usePlayerStore.getState().setFirstPlayerChunkCoord({
        x: this._chunkCoord.x,
        y: yCoordMax,
        z: this._chunkCoord.z,
      });
    }
  }

  private async loadSurfaceChunks(): Promise<number | void> {
    const chunkCoords: ChunkCoord[] = [];

    const currentSurfaceViewDistance =
      usePlayerStore.getState().surfaceViewDistance;

    for (
      let x = -currentSurfaceViewDistance;
      x <= currentSurfaceViewDistance;
      x++
    ) {
      for (
        let z = -currentSurfaceViewDistance;
        z <= currentSurfaceViewDistance;
        z++
      ) {
        const chunkCoord = {
          x: this._chunkCoord.x + x,
          y: this._chunkCoord.y,
          z: this._chunkCoord.z + z,
        };

        const surfaceChunkKey = chunkCoordsToSurfaceKey(chunkCoord);

        if (!this.requestedSurfaceChunkCoords.has(surfaceChunkKey)) {
          this.requestedSurfaceChunkCoords.add(surfaceChunkKey);
          chunkCoords.push(chunkCoord);
        }

        if (chunkCoords.length >= CHUNKS_MAX_REQUEST) break;
      }
      if (chunkCoords.length >= CHUNKS_MAX_REQUEST) break;
    }
    // console.log(chunkCoords);

    if (chunkCoords.length === 0) {
      const currentSurfaceViewDistance =
        usePlayerStore.getState().surfaceViewDistance;

      if (currentSurfaceViewDistance < VIEW_DISTANCE_MAX) {
        usePlayerStore.setState({
          surfaceViewDistance: currentSurfaceViewDistance + 1,
        });
        return this.loadSurfaceChunks();
      }
    }

    if (chunkCoords.length === 0) return;

    console.log(
      "loading surface chunks, distance:",
      currentSurfaceViewDistance,
      "#:",
      chunkCoords.length
    );
    const chunkDatas = await this.getOrLoadChunksXZ(chunkCoords);

    let yCoordMax = -Infinity;
    if (chunkDatas) {
      chunkDatas.forEach((chunkData) => {
        this.addChunk(chunkData, false);
        yCoordMax = Math.max(chunkData.y, yCoordMax);
      });
    } else {
      throw new Error("Chunks didnt load, panic!");
    }

    return yCoordMax;
  }

  private async loadChunksInRange() {
    const { viewDistance } = useSettingStore.getState();

    const chunkCoords: ChunkCoord[] = [];

    for (let x = -viewDistance; x <= viewDistance; x++) {
      for (let z = -viewDistance; z <= viewDistance; z++) {
        for (let y = -viewDistance; y <= viewDistance; y++) {
          const chunkCoord = {
            x: this._chunkCoord.x + x,
            y: this._chunkCoord.y + y,
            z: this._chunkCoord.z + z,
          };

          const chunkKey = chunkCoordsToKey(chunkCoord);

          if (
            !this.chunks.has(chunkKey) &&
            !this.requestedChunkCoords.has(chunkKey)
          ) {
            this.requestedChunkCoords.add(chunkKey);
            chunkCoords.push(chunkCoord);
          }
        }
      }
    }

    if (chunkCoords.length === 0) return;

    console.log(
      "loading chunks in range",
      this._chunkCoord,
      "#:",
      chunkCoords.length
    );
    const chunkDatas = await this.getOrLoadChunksXYZ(chunkCoords);

    if (chunkDatas) {
      chunkDatas.forEach((chunkData) => {
        this.addChunk(chunkData, true);
      });
    } else {
      throw new Error("Chunks didnt load, panic!");
    }

    // const chunkDatas = await Promise.all(chunkPromises);

    // // Add chunks to scene
    // for (const chunkData of chunkDatas) {
    //   if (chunkData) this.addChunk(chunkData);
    // }
  }

  private async getOrLoadChunksXZ(
    chunkCoords: ChunkCoord[]
  ): Promise<ChunkData[] | void> {
    const chunkPromise = this.api
      .getChunksXZ(chunkCoords, this.forceRegenerateChunks)
      .then((chunkDatas) => {
        return chunkDatas;
      });

    return await chunkPromise;
  }

  private async getOrLoadChunksXYZ(
    chunkCoords: ChunkCoord[]
  ): Promise<ChunkData[] | void> {
    const chunkPromise = this.api
      .getChunksXYZ(chunkCoords, this.forceRegenerateChunks)
      .then((chunkData) => {
        return chunkData;
      });

    return await chunkPromise;
  }

  //                      88           88
  //                      88           88
  //                      88           88
  // ,adPPYYba,   ,adPPYb,88   ,adPPYb,88
  // ""     `Y8  a8"    `Y88  a8"    `Y88
  // ,adPPPPP88  8b       88  8b       88
  // 88,    ,88  "8a,   ,d88  "8a,   ,d88
  // `"8bbdP"Y8   `"8bbdP"Y8   `"8bbdP"Y8

  private addChunk(chunkData: ChunkData, renderPriority = false): Chunk | void {
    const chunkKey = chunkCoordsToKey({
      x: chunkData.x,
      y: chunkData.y,
      z: chunkData.z,
    });

    // console.log('adding ', chunkKey)

    // if (updateStorage) useChunkStore.getState().addChunkData(chunkKey, chunkData);

    if (this.chunks.has(chunkKey)) {
      console.log("already exists, dropping", chunkKey);
      return;
    }

    const chunk = new Chunk(chunkData);
    this.chunks.set(chunkKey, chunk);

    useChunkStore.setState({
      chunkDataKeys: Array.from(this.chunks.keys()),
    });

    // chunk.renderMesh(true).then(() => {
    //   this.updateVisibleChunks();
    // });

    if (renderPriority) {
      this.chunkRenderQueue.unshift(chunk);
    } else {
      this.chunkRenderQueue.push(chunk);
    }

    if (!this.chunkRendering) this.startChunkRendering();

    return chunk;
  }

  //                                                88
  //                                                88
  //                                                88
  //  8b,dPPYba,   ,adPPYba,  8b,dPPYba,    ,adPPYb,88   ,adPPYba,  8b,dPPYba,
  //  88P'   "Y8  a8P_____88  88P'   `"8a  a8"    `Y88  a8P_____88  88P'   "Y8
  //  88          8PP"""""""  88       88  8b       88  8PP"""""""  88
  //  88          "8b,   ,aa  88       88  "8a,   ,d88  "8b,   ,aa  88
  //  88           `"Ybbd8"'  88       88   `"8bbdP"Y8   `"Ybbd8"'  88

  private startChunkRendering() {
    this.chunkRendering = true;
    this.renderNextChunk();
  }

  private stopChunkRendering() {
    if (this.chunkRenderTimer) clearTimeout(this.chunkRenderTimer);
    this.chunkRendering = false;
  }

  private renderNextChunk() {
    const chunk = this.chunkRenderQueue.shift();

    if (!chunk) {
      this.chunkRendering = false;
      return;
    }

    chunk.renderMesh(true).then(() => {
      // chunk.renderLiquidMesh().then(() => {
        // this.attach(chunk.meshLiquid);
        this.updateVisibleChunks();
        this.chunkRenderTimer = setTimeout(
          () => this.renderNextChunk(),
          CHUNK_RENDER_DELAY_MS
        );
      // });
    });
  }

  //                                     88
  //                                     88                ,d
  //                                     88                88
  //  88       88  8b,dPPYba,    ,adPPYb,88  ,adPPYYba,  MM88MMM  ,adPPYba,
  //  88       88  88P'    "8a  a8"    `Y88  ""     `Y8    88    a8P_____88
  //  88       88  88       d8  8b       88  ,adPPPPP88    88    8PP"""""""
  //  "8a,   ,a88  88b,   ,a8"  "8a,   ,d88  88,    ,88    88,   "8b,   ,aa
  //   `"YbbdP'Y8  88`YbbdP"'    `"8bbdP"Y8  `"8bbdP"Y8    "Y888  `"Ybbd8"'
  //               88
  //               88

  async updateVisibleChunks() {
    if (!this._chunkCoord) return;
    // console.log("visible chunk update");

    if (this.chunkRenderQueue.length === 0) {
      const currentSurfaceViewDistance =
        usePlayerStore.getState().surfaceViewDistance;

      if (currentSurfaceViewDistance < VIEW_DISTANCE_MAX) {
        this.loadSurfaceChunks();
      }

      if (!useGameStore.getState().hasFirstChunkLoaded) {
        console.log("starting player");
        useGameStore.getState().setHasFirstChunkLoaded(true);
      }
    }

    let colliderChanged = false;

    const _vec = new Vector3();
    for (const [key, chunk] of this.chunks) {
      if (!chunk.meshGenerated) continue;

      const chunkCoord = chunk.chunkCoord;
      _vec.set(
        chunkCoord.x - this._chunkCoord.x,
        chunkCoord.y - this._chunkCoord.y,
        chunkCoord.z - this._chunkCoord.z
      );
      const d = _vec.length();

      // if (d === 0) {
      //   useGameStore.getState().setHasFirstChunkLoaded(true);
      // }

      if (d < 2) {
        // within collider range
        if (!this.chunkKeysCollidable.has(key)) {
          // console.log(chunkCoord, chunk.position)
          // add to collider
          this.chunkKeysCollidable.add(key);
          this.castableChunkMeshs.attach(chunk.mesh.solid);
          this.castableChunkMeshs.attach(chunk.mesh.transparent);
          // this.attach(chunk.meshLiquid);
          chunk.copyTemp();
          this.attach(chunk.meshTemp);
          colliderChanged = true;
          // console.log(chunkCoord, chunk.mesh.position);
        }

        if (this.chunkKeysVisible.has(key)) {
          // remove from visible
          this.chunkKeysVisible.delete(key);
          this.remove(chunk.mesh.solid);
          this.remove(chunk.mesh.liquid);
          this.remove(chunk.mesh.transparent);
        }

        // console.log(key, 'c')
      } else {
        // out of collider range
        if (this.chunkKeysCollidable.has(key)) {
          // remove from collider
          this.chunkKeysCollidable.delete(key);
          this.castableChunkMeshs.remove(chunk.mesh.solid);
          this.castableChunkMeshs.remove(chunk.mesh.transparent);
          this.remove(chunk.meshTemp);
          colliderChanged = true;
        }

        if (!this.chunkKeysVisible.has(key)) {
          // add to visible
          this.chunkKeysVisible.add(key);
          this.attach(chunk.mesh.solid);
          this.attach(chunk.mesh.liquid);
          this.attach(chunk.mesh.transparent);
          // this.attach(chunk.meshLiquid);
          const v = new Vector3();
          chunk.mesh.getWorldPosition(v);
          // console.log(chunkCoord, v)
        }
      }
    }

    usePlayerStore.setState({
      visibleChunks: this.chunkKeysVisible.size + this.chunkKeysCollidable.size,
      collidableChunks: this.chunkKeysCollidable.size,
    });
    if (colliderChanged) this.updateCollider();
  }

  updateCollider() {
    // console.log("collider update");

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
    this.bvhVisuliser.visible = this.debug;
  }

  //           88
  //           88
  //           88
  //   ,adPPYb,88  8b,dPPYba,  ,adPPYYba,  8b      db      d8
  //  a8"    `Y88  88P'   "Y8  ""     `Y8  `8b    d88b    d8'
  //  8b       88  88          ,adPPPPP88   `8b  d8'`8b  d8'
  //  "8a,   ,d88  88          88,    ,88    `8bd8'  `8bd8'
  //   `"8bbdP"Y8  88          `"8bbdP"Y8      YP      YP

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
        // console.log(_change)
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

    if (useChunkStore.getState().storeChunksLocally)
      useChunkStore.getState().addChunkData(chunkKey, chunkData);

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
                                                                                                                              
  //             88                                   88          ,ad8888ba,   88                                     88         
  //             88                                   88         d8"'    `"8b  88                                     88         
  //             88                                   88        d8'            88                                     88         
  //  ,adPPYba,  88,dPPYba,    ,adPPYba,   ,adPPYba,  88   ,d8  88             88,dPPYba,   88       88  8b,dPPYba,   88   ,d8   
  // a8"     ""  88P'    "8a  a8P_____88  a8"     ""  88 ,a8"   88             88P'    "8a  88       88  88P'   `"8a  88 ,a8"    
  // 8b          88       88  8PP"""""""  8b          8888[     Y8,            88       88  88       88  88       88  8888[      
  // "8a,   ,aa  88       88  "8b,   ,aa  "8a,   ,aa  88`"Yba,   Y8a.    .a8P  88       88  "8a,   ,a88  88       88  88`"Yba,   
  //  `"Ybbd8"'  88       88   `"Ybbd8"'   `"Ybbd8"'  88   `Y8a   `"Y8888Y"'   88       88   `"YbbdP'Y8  88       88  88   `Y8a  
                                                                                                                              
                                                                                                                              
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
  //   ,ad8888ba,               88  88  888888888888                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          88   ad88888ba     d8'                        ad88888ba    ad88888ba                                                                        
  //  d8"'    `"8b              88  88       88                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               88  d8"     "8b   d8'                        d8"     "8b  d8"     "8b                                                                       
  // d8'                        88  88       88                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               88  Y8a     a8P  ""                          Y8a     a8P  Y8a     a8P                                                                       
  // 88              ,adPPYba,  88  88       88  8b       d8  8b,dPPYba,    ,adPPYba,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 ,adPPYb,88   "Y8aaa8P"                                "Y8aaa8P"    "Y8aaa8P"                                                                        
  // 88             a8P_____88  88  88       88  `8b     d8'  88P'    "8a  a8P_____88                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                a8"    `Y88   ,d8"""8b,                                ,d8"""8b,    ,d8"""8b,                                                                        
  // Y8,            8PP"""""""  88  88       88   `8b   d8'   88       d8  8PP"""""""                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                8b       88  d8"     "8b                              d8"     "8b  d8"     "8b                                                                       
  //  Y8a.    .a8P  "8b,   ,aa  88  88       88    `8b,d8'    88b,   ,a8"  "8b,   ,aa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                "8a,   ,d88  Y8a     a8P                              Y8a     a8P  Y8a     a8P                                                                       
  //   `"Y8888Y"'    `"Ybbd8"'  88  88       88      Y88'     88`YbbdP"'    `"Ybbd8"'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 `"8bbdP"Y8   "Y88888P"                                "Y88888P"    "Y88888P"                                                                        
  //                                                 d8'      88                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
  //                                                d8'       88                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
  getGridType(worldPosition: Vector3): number | void {
    const chunkCoord = worldPosition.clone().divideScalar(TERRAIN_SIZE).floor();

    const chunkKey = chunkCoordsToKey({ x: chunkCoord.x, y: chunkCoord.y, z: chunkCoord.z })

    const chunk = this.chunks.get(chunkKey);

    if(chunk) {
      return chunk.getGridType(worldPosition.clone());
    }
    return
  }
  dispose() {
    this.unsubPlayerStore();
  }
}
