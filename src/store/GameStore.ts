// store/PlayerStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'

export enum MenuStatus {
  Playing,
  Home,
  Inventory,
  Settings,
  Login
}

type GameStore = {
  hasFirstChunkLoaded: boolean;
  setHasFirstChunkLoaded: (hasFirstChunkLoaded: boolean) => void;
  menuStatus: MenuStatus;
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    (set) => ({
      hasFirstChunkLoaded: false,
      setHasFirstChunkLoaded: (hasFirstChunkLoaded) => set({ hasFirstChunkLoaded }),
      menuStatus: MenuStatus.Home,
    })
  )
);