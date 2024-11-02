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
  uint8ArrayToBase64,
  worldToChunkPosition,
} from "../utils/functions";

import { TERRAIN_SCALE, TERRAIN_SIZE } from "../utils/constants";
import { BuildPreset } from "../builder/BuildPresets";
import { VEC2_0, VEC3_0 } from "../utils/vector_utils";

export class Chunk extends Object3D {
  public chunkKey: string;
  public chunkCoord: ChunkCoord;

  private grid = new Float32Array();
  private gridTemp = new Float32Array();
  public mesh = new ChunkMesh();
  public meshTemp = new ChunkMesh();

  public meshGenerated = false;

  private materialGrid = new Float32Array();

  private _gridCell: Vector3 = new Vector3();
  private isDefaultMeshTemp = false;

  private materials = [];

  constructor(private chunkData: ChunkData) {
    super();
    this.chunkKey = chunkData.id;
    this.chunkCoord = { x: chunkData.x, y: chunkData.y, z: chunkData.z };

    this.grid = this.readGridFromString(chunkData);
    this.materialGrid = new Float32Array(this.grid).fill(1);

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

  readGridFromString(chunkData: ChunkData): Float32Array {
    const gridUint8 = base64ToUint8Array(chunkData.grid);
    return decompressUint8ToFloat32(gridUint8);
  }

  gridToString(): string {
    const gridUint8 = compressFloat32ArrayToUint8(this.grid);
    return uint8ArrayToBase64(gridUint8);
  }

  toChunkData(): ChunkData {
    return {
      id: this.chunkKey,
      grid: this.gridToString(),
      x: this.chunkCoord.x,
      y: this.chunkCoord.y,
      z: this.chunkCoord.z,
    };
  }

  async renderMesh(isPlacing = true) {
    const _mesh = isPlacing ? this.mesh : this.meshTemp;
    const _grid = isPlacing ? this.grid : this.gridTemp;
    await _mesh.generateMeshData(_grid, this.materialGrid)

    if(isPlacing) this.meshGenerated = true;

    if (!isPlacing) this.isDefaultMeshTemp = false;
  }

  copyTemp() {
    if (!this.isDefaultMeshTemp) {
      this.meshTemp.geometry.copy(this.mesh.geometry);
      this.isDefaultMeshTemp = true;
    }
  }

  private p: Vector3 = new Vector3();
  public draw(
    center: Vector3,
    inverseRotation: Quaternion,
    bbox: Box3,
    buildConfig: BuildPreset,
    isPlacing = false
  ): boolean {
    worldToChunkPosition(center, this.position);
    worldToChunkPosition(bbox.min, this.position);
    worldToChunkPosition(bbox.max, this.position);
    bbox.min.floor();
    bbox.max.ceil();

    const drawFunc = {
      sphere: this.drawSphere,
      cube: this.drawCube,
      cylinder: this.drawCylinder,
    }[buildConfig.shape];

    const weight = buildConfig.constructive ? 1 : -1;
    let isChanged = false;

    if (!isPlacing) {
      this.gridTemp = new Float32Array(this.grid);

      if (!drawFunc) {
        // if we set buildPreset to none, clear the temp grid
        this.renderMesh(isPlacing);
        return true;
      }
    }
    if (!drawFunc) return false;

    for (let y = bbox.min.y; y <= bbox.max.y; y++) {
      for (let z = bbox.min.z; z <= bbox.max.z; z++) {
        for (let x = bbox.min.x; x <= bbox.max.x; x++) {
          this._gridCell.set(x, y, z);
          if (pointIsInsideGrid(this._gridCell)) {
            this.p.set(x, y, z).sub(center);
            this.p.applyQuaternion(inverseRotation);

            const d = drawFunc(this.p, buildConfig) * weight;

            const _change = this.addValueToGrid(
              this._gridCell,
              d,
              buildConfig.constructive,
              isPlacing
            );
            isChanged = isChanged || _change;
            if (_change && d > -0.5) {
              this.updateMaterialGrid(this._gridCell, buildConfig.material);
            }
          }
        }
      }
    }
    // console.log(this.chunkKey, isPlacing, isChanged, c, e);
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

  addValueToGrid(
    p: Vector3,
    v: number,
    constructive: boolean,
    isPlacing: boolean
  ): boolean {
    const _grid = isPlacing ? this.grid : this.gridTemp;
    if (!_grid) return false;

    const gridIndex = gridCellToIndex(p);

    v = clamp(v, -0.5, 0.5);

    if (constructive && v > _grid[gridIndex]) {
      _grid[gridIndex] = v;
      return true;
    }

    if (!constructive && v < _grid[gridIndex]) {
      _grid[gridIndex] = v;
      return true;
    }

    return false;
  }

  updateMaterialGrid(p: Vector3, material: string) {
    const gridIndex = gridCellToIndex(p);
    const materialIndex = 2;

    this.materialGrid[gridIndex] = materialIndex;
  }
}
