// store/ChunkStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChunkData = {
  data: Uint8Array;
  x: number;
  y: number;
  z: number;
  owner?: string;
  name?: string;
};

type ChunkStore = {
  chunks: Map<string, ChunkData>;
  currentChunk?: ChunkData;
};

export const useChunkStore = create<ChunkStore>()(
  persist(
    (set) => ({
      chunks: new Map(),
    }),
    {
      name: 'chunk-store',
    }
  )
);