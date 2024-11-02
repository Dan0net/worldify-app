// store/PlayerStore.ts
import { Vector3 } from 'three';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware'
import { ChunkCoord } from '../utils/interfaces';

type PlayerStore = {
  chunkCoord: ChunkCoord;
  buildPreset: number;
  buildMaterial: number;
  setPlayerChunkCoord: (chunkCoord: ChunkCoord) => void;
  setBuildPreset: (buildPreset: number) => void;
  setBuildMaterial: (buildMaterial: number) => void;
};

export const usePlayerStore = create<PlayerStore>()(
  subscribeWithSelector(
    // persist(
    (set) => ({
      chunkCoord: {x: 0, y: 0, z: 0},
      buildPreset: 0,
      buildMaterial: 0,
      setPlayerChunkCoord: (chunkCoord) => set({ chunkCoord }),
      setBuildPreset: (buildPreset) => set({ buildPreset }),
      setBuildMaterial: (buildMaterial) => set({ buildMaterial }),
    }),
    // {
    //   name: 'player-store',
    // }
  )
// )
);