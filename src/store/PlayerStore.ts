// store/PlayerStore.ts
import { Vector3 } from 'three';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware'
import { ChunkCoord, Vec3 } from '../utils/interfaces';

type PlayerStore = {
  chunkCoord: ChunkCoord;
  visibleChunks: number,
  collidableChunks: number,
  surfaceViewDistance: number,
  buildPreset: number;
  buildMaterial: number;
  firstPlayerChunkCoord: ChunkCoord;
  setPlayerChunkCoord: (chunkCoord: ChunkCoord) => void;
  setFirstPlayerChunkCoord: (position: ChunkCoord) => void;
  setBuildPreset: (buildPreset: number) => void;
  setBuildMaterial: (buildMaterial: number) => void;
};

export const usePlayerStore = create<PlayerStore>()(
  subscribeWithSelector(
    // persist(
    (set) => ({
      // chunkCoord: {x: -7, y: 0, z: -7},
      chunkCoord: {x: 0, y: 0, z: -7},
      visibleChunks: 0,
      collidableChunks: 0,
      surfaceViewDistance: 0,
      firstPlayerChunkCoord: {x: -3, y: 0, z: -4},
      buildPreset: 0,
      buildMaterial: 0,
      setPlayerChunkCoord: (chunkCoord) => set({ chunkCoord }),
      setFirstPlayerChunkCoord: (firstPlayerChunkCoord) => set({ firstPlayerChunkCoord }),
      setBuildPreset: (buildPreset) => set({ buildPreset }),
      setBuildMaterial: (buildMaterial) => set({ buildMaterial }),
    }),
    // {
    //   name: 'player-store',
    // }
  )
// )
);