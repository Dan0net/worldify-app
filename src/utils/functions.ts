import { Box3, LineSegments, Mesh, Object3D, Vector3 } from "three";
import { ChunkCoord } from "./interfaces";
import { TERRAIN_GRID_SIZE_MARGIN, TERRAIN_SCALE } from "./constants";

export function getChunkKey(chunkCoords: ChunkCoord): string {
  return `${chunkCoords.x}:${chunkCoords.y}:${chunkCoords.z}`;
}

export function worldToChunkPosition(point: Vector3, chunkPosition: Vector3) {
  point.sub(chunkPosition).divideScalar(TERRAIN_SCALE);
}

export function pointIsInsideGrid(point: Vector3) {
  return ( point.x >= 0 && point.x < TERRAIN_GRID_SIZE_MARGIN &&
    point.y >= 0 && point.y < TERRAIN_GRID_SIZE_MARGIN &&
    point.z >= 0 && point.z < TERRAIN_GRID_SIZE_MARGIN );
}

// todo refactor to utils and make more efficient
export function decompressUint8ToFloat32(
  uint8Array: Uint8Array,
  min = -0.5,
  max = 0.5
): Float32Array {
  // Create a Uint8Array for the compressed values
  const floatArray = new Float32Array(uint8Array.length);

  // Normalize the floats to the range 0-255 and compress to 8 bits
  for (let i = 0; i < uint8Array.length; i++) {
    // Normalize the float to the range 0-255
    floatArray[i] = (uint8Array[i] / 255) * (max - min) + min;
  }

  return floatArray;
}

export function compressFloat32ArrayToUint8(
  floatArray: Float32Array,
  min = -0.5,
  max = 0.5
): Uint8Array {
  // Create a Uint8Array for the compressed values
  const compressedArray = new Uint8Array(floatArray.length);

  // Normalize the floats to the range 0-255 and compress to 8 bits
  for (let i = 0; i < floatArray.length; i++) {
    // Normalize the float to the range 0-255
    const normalizedValue = ((floatArray[i] - min) / (max - min)) * 255;
    compressedArray[i] = Math.max(
      0,
      Math.min(255, Math.round(normalizedValue))
    );
  }

  return compressedArray;
}

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
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
