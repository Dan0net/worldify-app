import { ChunkCoord } from "./interfaces";

export function getChunkKey(chunkCoords: ChunkCoord): string {
  return `${chunkCoords.x}:${chunkCoords.y}:${chunkCoords.z}`;
}

// todo refactor to utils and make more efficient
export function decompressUint8ToFloat32(uint8Array: Uint8Array, min = -0.5, max = 0.5): Float32Array {
  // Create a Uint8Array for the compressed values
  const floatArray = new Float32Array(uint8Array.length);

  // Normalize the floats to the range 0-255 and compress to 8 bits
  for (let i = 0; i < uint8Array.length; i++) {
    // Normalize the float to the range 0-255
    floatArray[i] = ((uint8Array[i] / 255) * (max - min)) + min;
  }

  return floatArray;
}

export function compressFloat32ArrayToUint8(floatArray: Float32Array, min = -0.5, max = 0.5): Uint8Array {
  // Create a Uint8Array for the compressed values
  const compressedArray = new Uint8Array(floatArray.length);

  // Normalize the floats to the range 0-255 and compress to 8 bits
  for (let i = 0; i < floatArray.length; i++) {
    // Normalize the float to the range 0-255
    const normalizedValue = ((floatArray[i] - min) / (max - min)) * 255;
    compressedArray[i] = Math.max(0, Math.min(255, Math.round(normalizedValue)));
  }

  return compressedArray;
}

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binaryString = '';
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