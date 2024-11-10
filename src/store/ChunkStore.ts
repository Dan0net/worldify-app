// store/ChunkStore.ts
import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { ChunkData } from '../utils/interfaces';
import { STORAGE_CHUNKS_MAX } from '../utils/constants';

type ChunkStore = {
  currentChunk: ChunkData | null;
  chunkDataKeys: string[]
  chunkData: {
    [key: string]: ChunkData
  };
  storeChunksLocally: boolean,
  addChunkData: (key: string, chunkData: ChunkData) => void;
  // removeChunkData: (key: string) => void;
};

export const useChunkStore = create<ChunkStore>()(
  persist(
    (set) => ({
      currentChunk: null,
      chunkDataKeys: [],
      chunkData: {},
      storeChunksLocally: false,
      addChunkData: (key, chunkData) =>
        set((state) => {
          state.chunkData[key] = chunkData;
          state.chunkDataKeys.push(key);

          while(state.chunkDataKeys.length > STORAGE_CHUNKS_MAX) {
            const key = state.chunkDataKeys.shift();
            if(key && key in state.chunkData) delete state.chunkData[key];
          }
          // console.log(state.chunkDataKeys.length, Object.keys(state.chunkData))

          return { chunkData: state.chunkData,
            chunkDataKeys: state.chunkDataKeys
           };
        }),
      // removeChunkData: (key) =>
      //   set((state) => {
      //     delete state.chunkData[key];
      //     return { chunkData: state.chunkData };
      //   }),
    }),
    {
      name: 'chunk-store',
    }
  )
);