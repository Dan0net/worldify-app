// store/PlayerStore.ts
import { Vector3 } from 'three';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware'
import { ChunkCoord } from '../utils/interfaces';

type PlayerStore = {
  chunkCoord: ChunkCoord;
  buildPreset: string;
  setPlayerChunkCoord: (chunkCoord: ChunkCoord) => void;
  setBuildPreset: (preset: string) => void;
};

export const usePlayerStore = create<PlayerStore>()(
  subscribeWithSelector(
    // persist(
    (set) => ({
      chunkCoord: {x: 0, y: 0, z: 0},
      buildPreset: 'cube',
      setPlayerChunkCoord: (chunkCoord) => set({ chunkCoord }),
      setBuildPreset: (preset) => set({ buildPreset: preset }),
    }),
    // {
    //   name: 'player-store',
    // }
  )
// )
);