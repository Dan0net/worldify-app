// store/PlayerStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'

type GameStore = {
  hasFirstChunkLoaded: boolean;
  hasStarted: boolean;
  setHasStarted: (hasStarted: boolean) => void;
  setHasFirstChunkLoaded: (hasFirstChunkLoaded: boolean) => void;
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    (set) => ({
      hasFirstChunkLoaded: false,
      hasStarted: false,
      setHasStarted: (hasStarted) => set({ hasStarted }),
      setHasFirstChunkLoaded: (hasFirstChunkLoaded) => set({ hasFirstChunkLoaded }),
    })
  )
);