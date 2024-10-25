// store/ChunkStore.ts
import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { ChunkData } from '../utils/interfaces';

type ChunkStore = {
  chunks: Map<string, ChunkData>;
  addChunk: (key: string, chunk: ChunkData) => void;
  removeChunk: (key: string) => void;
};

type SerializedChunkStore = {
  chunks: Array<[string, ChunkData]>;
};

export const useChunkStore = create<ChunkStore>()(
  // persist(
    (set) => ({
      chunks: new Map(),
      addChunk: (key, chunk) =>
        set((state) => {
          console.log(state.chunks)
          state.chunks.set(key, chunk);
          return { chunks: state.chunks };
        }),
      removeChunk: (key) =>
        set((state) => {
          state.chunks.delete(key);
          return { chunks: state.chunks };
        }),
    }),
    // {
    //   name: 'chunk-store',
    //   serialize: (state) => {
    //     const chunksArray = Array.from(state.state.chunks.entries());
    //     console.log({ chunks: chunksArray })
    //     return JSON.stringify({ 
    //       ...state,
    //       state: {
    //         ...state.state,
    //         chunks: chunksArray,
    //       }, 
    //     });
    //   },
    //   deserialize: (str) => {
    //     console.log(str)
    //     const data = JSON.parse(str);
    //     console.log(data)
    //     const chunks = new Map<string, ChunkData>(data.state.chunks);
    //     console.log(chunks)
    //     return {
    //       ...data,
    //       state: {
    //         ...data.state,
    //         chunks,
    //       },
    //     };
    //   },
    // } as PersistOptions<ChunkStore, SerializedChunkStore>
  // )
);