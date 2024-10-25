// store/PlayerStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'

type GameStore = {
  hasStarted: boolean;
  setHasStarted: (hasStarted: boolean) => void;
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    (set) => ({
      hasStarted: false,
      setHasStarted: (hasStarted) => set({ hasStarted }),
    })
  )
);