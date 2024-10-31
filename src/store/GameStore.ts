// store/PlayerStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'

type GameStore = {
  hasFirstChunkLoaded: boolean;
  hasStarted: boolean;
  isInventoryVisible: boolean;
  setHasStarted: (hasStarted: boolean) => void;
  setHasFirstChunkLoaded: (hasFirstChunkLoaded: boolean) => void;
  toggleInventory: () => void;
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    (set) => ({
      hasFirstChunkLoaded: false,
      hasStarted: false,
      isInventoryVisible: false,
      setHasStarted: (hasStarted) => set({ hasStarted }),
      setHasFirstChunkLoaded: (hasFirstChunkLoaded) => set({ hasFirstChunkLoaded }),
      toggleInventory: () => set((state) => ({ isInventoryVisible: !state.isInventoryVisible }))
    })
  )
);