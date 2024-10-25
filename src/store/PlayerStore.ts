// store/PlayerStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as THREE from 'three';

type PlayerStore = {
  position: THREE.Vector3;
  buildPreset: string;
  setPosition: (position: THREE.Vector3) => void;
  setBuildPreset: (preset: string) => void;
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      position: new THREE.Vector3(),
      buildPreset: 'cube',
      setPosition: (position) => set({ position }),
      setBuildPreset: (preset) => set({ buildPreset: preset }),
    }),
    {
      name: 'player-store',
    }
  )
);