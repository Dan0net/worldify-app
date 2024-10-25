// store/PlayerStore.ts
import { Vector3 } from 'three';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware'
import { ChunkCoord } from '../utils/interfaces';

type PlayerStore = {
  chunkCoord: ChunkCoord;
  position: Vector3;
  buildPreset: string;
  setPosition: (position: Vector3) => void;
  setBuildPreset: (preset: string) => void;
};

export const usePlayerStore = create<PlayerStore>()(
  subscribeWithSelector(persist(
    (set) => ({
      chunkCoord: {x: 0, y: 0, z: 0},
      position: new Vector3(),
      buildPreset: 'cube',
      setPosition: (position) => set({ position }),
      setBuildPreset: (preset) => set({ buildPreset: preset }),
    }),
    {
      name: 'player-store',
    }
  ))
);