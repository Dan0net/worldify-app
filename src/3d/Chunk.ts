// 3d/Chunk.ts
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector2,
  Vector3,
} from "three";
import { ChunkCoord, ChunkData } from "../utils/interfaces";
import { ChunkMesh } from "./ChunkMesh";
import {
  base64ToUint8Array,
  clamp,
  compressFloat32ArrayToUint8,
  decompressUint8ToFloat32,
  gridCellToIndex,
  pointIsInsideGrid,
  arrayToBase64,
  worldToChunkPosition,
} from "../utils/functions";

import { TERRAIN_SCALE, TERRAIN_SIZE } from "../utils/constants";
import { BuildPreset } from "../builder/BuildPresets";
import { VEC2_0, VEC3_0 } from "../utils/vector_utils";
import { MatterialPallet } from "../material/MaterialPallet";

export class Chunk extends Object3D {
  public chunkKey: string;
  public chunkCoord: ChunkCoord;

  public mesh = new ChunkMesh();
  public meshTemp = new ChunkMesh();

  public meshGenerated = false;

  private _gridCell: Vector3 = new Vector3();
  private isDefaultMeshTemp = false;

  constructor(private chunkData: ChunkData) {
    super();
    this.chunkKey = chunkData.id;
    this.chunkCoord = { x: chunkData.x, y: chunkData.y, z: chunkData.z };

    this.mesh.readGridFromString(chunkData);

    this.add(this.mesh);
    this.add(this.meshTemp);

    this.scale.set(TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);

    this.position.set(
      this.chunkCoord.x * TERRAIN_SIZE,
      this.chunkCoord.y * TERRAIN_SIZE,
      this.chunkCoord.z * TERRAIN_SIZE
    );

    this.updateMatrix();
  }

  toChunkData(): ChunkData {
    return {
      id: this.chunkKey,
      grid: this.mesh.gridToString(),
      x: this.chunkCoord.x,
      y: this.chunkCoord.y,
      z: this.chunkCoord.z,
    };
  }

  async renderMesh(isPlacing = true) {
    const _mesh = isPlacing ? this.mesh : this.meshTemp;
    await _mesh.generateMeshData();
    
    
    if (isPlacing) this.meshGenerated = true;

    if (!isPlacing) this.isDefaultMeshTemp = false;
  }

  copyTemp() {
    if (!this.isDefaultMeshTemp) {
      this.meshTemp.geometry.copy(this.mesh.geometry);
      this.isDefaultMeshTemp = true;
    }
  }

  //           88
  //           88
  //           88
  //   ,adPPYb,88  8b,dPPYba,  ,adPPYYba,  8b      db      d8
  //  a8"    `Y88  88P'   "Y8  ""     `Y8  `8b    d88b    d8'
  //  8b       88  88          ,adPPPPP88   `8b  d8'`8b  d8'
  //  "8a,   ,d88  88          88,    ,88    `8bd8'  `8bd8'
  //   `"8bbdP"Y8  88          `"8bbdP"Y8      YP      YP

  private p: Vector3 = new Vector3();
  public draw(
    center: Vector3,
    inverseRotation: Quaternion,
    bbox: Box3,
    buildConfig: BuildPreset,
    isPlacing = false
  ): boolean {
    worldToChunkPosition(center, this.position);
    const centerRound = center.clone().round();
    worldToChunkPosition(bbox.min, this.position);
    worldToChunkPosition(bbox.max, this.position);
    bbox.min.floor();
    bbox.max.ceil().addScalar(1);

    const drawFunc = {
      sphere: this.drawSphere,
      cube: this.drawCube,
      cylinder: this.drawCylinder,
    }[buildConfig.shape];

    const weight = buildConfig.constructive ? 1 : -1;
    let isChanged = false;

    if (!isPlacing) {
      this.meshTemp.copyGridFromChunkMesh(this.mesh);

      if (!drawFunc) {
        // if we set buildPreset to none, clear the temp grid
        // this.renderMesh(isPlacing);
        this.meshTemp.geometry.copy(this.mesh.geometry);
        return true;
      }
    }
    if (!drawFunc) return false;

    const _mesh = isPlacing ? this.mesh : this.meshTemp;

    for (let y = bbox.min.y; y <= bbox.max.y; y++) {
      for (let z = bbox.min.z; z <= bbox.max.z; z++) {
        for (let x = bbox.min.x; x <= bbox.max.x; x++) {
          this._gridCell.set(x, y, z);
          if (pointIsInsideGrid(this._gridCell)) {
            this.p.set(x, y, z).sub(center);
            this.p.applyQuaternion(inverseRotation);

            const d = drawFunc(this.p, buildConfig) * weight;

            const gridIndex = gridCellToIndex(this._gridCell);

            const _change = _mesh.addValueToGrid(
              gridIndex,
              d,
              buildConfig
            );

            isChanged = isChanged || _change;

            // if (_change && d > -0.5) {
            //   _mesh.updateMaterialGrid(gridIndex, buildConfig);
            // }
          }
        }
      }
    }
    // console.log(this.chunkKey, isPlacing, isChanged);
    if (isChanged) this.renderMesh(isPlacing);

    return isChanged;
  }

  drawSphere(p: Vector3, buildConfig: BuildPreset) {
    let d = p.length() - buildConfig.size.x * 2;
    return -d;
  }

  drawCube(p: Vector3, buildConfig: BuildPreset) {
    p.set(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));

    const q = p.sub(buildConfig.size); // clone or set original?
    const outsideD = q.clone().max(VEC3_0).length();
    const insideD = Math.min(Math.max(q.x, q.y, q.z), 0.0);
    const d = outsideD + insideD;
    return -d;
  }

  drawCylinder(p: Vector3, buildConfig: BuildPreset) {
    const l = new Vector2(p.x, p.z).length();
    const d = new Vector2(
      Math.abs(l) - buildConfig.size.x,
      Math.abs(p.y) - buildConfig.size.y
    );
    const a = Math.min(Math.max(d.x, d.y), 0.0) + d.max(VEC2_0).length();
    return -a;
  }
}
