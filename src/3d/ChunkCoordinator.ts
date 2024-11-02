// 3d/ChunkCoordinator.ts
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
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
import { TERRAIN_SIZE } from "../utils/constants";
import { chunkCoordsToKey } from "../utils/functions";
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

  private debug = false;
  private unsubPlayerStore: () => void;

  private currentChunkCoord: ChunkCoord;

  constructor(private inputController: InputController) {
    super();

    this.unsubPlayerStore = usePlayerStore.subscribe(
      (state) => state.chunkCoord,
      (chunkCoord, previousChunkCoord) => {
        if (
          chunkCoord.x !== previousChunkCoord.x ||
          chunkCoord.y !== previousChunkCoord.y ||
          chunkCoord.z !== previousChunkCoord.z
        ) {
          console.log(chunkCoord, previousChunkCoord);
          this.currentChunkCoord = chunkCoord;
          this.createChunksInRange();
          this.updateVisibleChunks();
        }
      }
    );

    const { chunkCoord } = usePlayerStore.getState();

    this.currentChunkCoord = chunkCoord;
    this.createFirstChunk();

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
                                            
  private async createFirstChunk() {
    console.log('creating first chunk', this.currentChunkCoord)
    const chunkData = await this.getOrLoadChunk(this.currentChunkCoord);

    if (chunkData) {
      this.addChunk(chunkData);
      // useGameStore.getState().setHasFirstChunkLoaded(true);
    } else {
      throw new Error("First chunk didnt load, panic!");
    }

    console.log('created first chunk getting rest')
    this.createChunksInRange();
    // this.updateVisibleChunks(chunkCoord);
  }

  private async createChunksInRange() {
    const { viewDistance } = useSettingStore.getState();
    
    console.log('creating chunks in range', this.currentChunkCoord)
    const chunksToLoad: ChunkCoord[] = [];

    for (let x = -viewDistance; x <= viewDistance; x++) {
      for (let z = -viewDistance; z <= viewDistance; z++) {
        for (let y = -2; y <= 2; y++) {
          chunksToLoad.push({
            x: this.currentChunkCoord.x + x,
            y: this.currentChunkCoord.y + y,
            z: this.currentChunkCoord.z + z,
          });
        }
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
    

    // this.updateVisibleChunks();
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
        // console.log("loading chunk from storage", chunkCoord);
        return existingChunk;
      }
    }

    // console.log("requesting chunk from api", chunkCoord);
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

                                        
  //                      88           88  
  //                      88           88  
  //                      88           88  
  // ,adPPYYba,   ,adPPYb,88   ,adPPYb,88  
  // ""     `Y8  a8"    `Y88  a8"    `Y88  
  // ,adPPPPP88  8b       88  8b       88  
  // 88,    ,88  "8a,   ,d88  "8a,   ,d88  
  // `"8bbdP"Y8   `"8bbdP"Y8   `"8bbdP"Y8  
                                        
                                        

  private addChunk(chunkData: ChunkData, updateStorage = false) {
    const chunkKey = chunkCoordsToKey({
      x: chunkData.x,
      y: chunkData.y,
      z: chunkData.z,
    });
    // console.log('adding ', chunkKey)

    // if (updateStorage) useChunkStore.getState().addChunkData(chunkKey, chunkData);

    const chunk = new Chunk(chunkData);
    this.chunks.set(chunkKey, chunk);

    chunk.renderMesh(true).then(() => {
      this.updateVisibleChunks();
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
    if (!this.currentChunkCoord) return;

    let colliderChanged = false;

    const _vec = new Vector3();
    for (const [key, chunk] of this.chunks) {
      if (!chunk.meshGenerated) continue;

      const chunkCoord = chunk.chunkCoord;
      _vec.set(
        chunkCoord.x - this.currentChunkCoord.x,
        chunkCoord.y - this.currentChunkCoord.y,
        chunkCoord.z - this.currentChunkCoord.z
      );
      const d = _vec.length();

      if (d === 0) {
        useGameStore.getState().setHasFirstChunkLoaded(true);
      }
      if (d < 2) {
        // within collider range
        if (!this.chunkKeysCollidable.has(key)) {
      // console.log(chunkCoord, chunk.position)
      // add to collider
          this.chunkKeysCollidable.add(key);
          this.castableChunkMeshs.attach(chunk.mesh);
          chunk.copyTemp();
          this.attach(chunk.meshTemp);
          colliderChanged = true;
          // console.log(chunkCoord, chunk.mesh.position)
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
          const v = new Vector3()
          chunk.mesh.getWorldPosition(v)
          // console.log(chunkCoord, v)
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
