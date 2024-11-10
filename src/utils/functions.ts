import { Box3, LineSegments, Mesh, Object3D, TypedArray, Vector3 } from "three";
import { ChunkCoord } from "./interfaces";
import { TERRAIN_GRID_SIZE_MARGIN, TERRAIN_SCALE } from "./constants";

export function chunkCoordsToKey(chunkCoord: ChunkCoord): string {
  return `${chunkCoord.x}:${chunkCoord.y}:${chunkCoord.z}`;
}

export function chunkCoordsToSurfaceKey(chunkCoord: ChunkCoord): string {
  return `${chunkCoord.x}:${chunkCoord.z}`;
}

export function chunkKeyToCord(chunkKey: string): ChunkCoord {
  const split = chunkKey.split(":");
  return {
    x: parseInt(split[0]),
    y: parseInt(split[0]),
    z: parseInt(split[0]),
  };
}

export function worldToChunkPosition(point: Vector3, chunkPosition: Vector3) {
  point.sub(chunkPosition).divideScalar(TERRAIN_SCALE);
}

export function gridCellToIndex(p: Vector3) {
  return (
    p.z * (TERRAIN_GRID_SIZE_MARGIN * TERRAIN_GRID_SIZE_MARGIN) +
    p.y * TERRAIN_GRID_SIZE_MARGIN +
    p.x
  );
}

export function pointIsInsideGrid(point: Vector3) {
  return (
    point.x >= 0 &&
    point.x < TERRAIN_GRID_SIZE_MARGIN &&
    point.y >= 0 &&
    point.y < TERRAIN_GRID_SIZE_MARGIN &&
    point.z >= 0 &&
    point.z < TERRAIN_GRID_SIZE_MARGIN
  );
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

// todo refactor to utils and make more efficient
export function decompressUint8ToFloat32(
  uint8Array: Uint8Array,
  min = -0.5,
  max = 0.5,
  bits = 8
): Float32Array {
  // Create a Uint8Array for the compressed values
  const floatArray = new Float32Array(uint8Array.length);
  const maxValue = (2 ** bits) - 1;

  // Normalize the floats to the range 0-255 and compress to 8 bits
  for (let i = 0; i < uint8Array.length; i++) {
    // Normalize the float to the range 0-255
    floatArray[i] = (uint8Array[i] / maxValue) * (max - min) + min;
  }

  return floatArray;
}

export function compressFloat32ArrayToUint8(
  floatArray: Float32Array,
  min = -0.5,
  max = 0.5,
  bits = 8
): Uint8Array {
  // Create a Uint8Array for the compressed values
  const compressedArray = new Uint8Array(floatArray.length);
  const maxValue = (2 ** bits) - 1;
  // Normalize the floats to the range 0-255 and compress to 8 bits
  for (let i = 0; i < floatArray.length; i++) {
    // Normalize the float to the range 0-255
    const normalizedValue = ((floatArray[i] - min) / (max - min)) * maxValue;
    compressedArray[i] = Math.max(
      0,
      Math.min(maxValue, Math.round(normalizedValue))
    );
  }

  return compressedArray;
}

export function arrayToBase64(array: TypedArray): string {
  const uint8Array = new Uint8Array(array.buffer);
  let binaryString = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

export function base64ToUint8Array(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const uint8Array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return uint8Array;
}

export function base64ToUint16Array(base64String: string): Uint16Array {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const uint8Array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return new Uint16Array(uint8Array.buffer);
}

export function packGridArray(
  weights: Uint8Array,
  materials: Uint8Array,
  lights: Uint8Array
) {
  const length = weights.length;
  const packedArray = new Uint16Array(length);
  for (let i = 0; i < length; i++) {
    // Ensure values fit within their respective bit sizes
    const weight = weights[i] & 0x1f; // 5 bits: 0x1F = 0001 1111
    const material = materials[i] & 0x7f; // 7 bits: 0x7F = 0111 1111
    const light = lights[i] & 0x0f; // 4 bits: 0x0F = 0000 1111

    // Pack the values into a single 16-bit integer
    const packedValue = (weight << 11) | (material << 4) | light;

    packedArray[i] = packedValue;
  }

  return packedArray;
}

export function unpackGridArray(grid: Uint16Array) {
  const length = grid.length;
  
  const weights = new Uint8Array(length);
  const materials = new Uint8Array(length);
  const lights = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    const packedValue = grid[i];

    // Extract the light value (bits 0-3)
    const light = packedValue & 0x0f; // 0x0F = 0000 1111
    // Extract the material value (bits 4-10)
    const material = (packedValue >> 4) & 0x7f; // 0x7F = 0111 1111
    
    // Extract the weight value (bits 11-15)
    const weight = (packedValue >> 11) & 0x1f; // 0x1F = 0001 1111

    lights[i] = light;
    materials[i] = material;
    weights[i] = weight;
  }

  return { weights, materials, lights };
}

// Utility throttle function
export function throttle(fn, limit) {
  let lastCall = 0;
  return function (this: Function, ...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

export function getExtents(_obj: Mesh | LineSegments, _bbox: Box3) {
  _obj.geometry.computeBoundingBox();
  _bbox.setFromObject(_obj);
  return new Vector3(
    _bbox.max.x - _bbox.min.x,
    _bbox.max.y - _bbox.min.y,
    _bbox.max.z - _bbox.min.z
  );
}
