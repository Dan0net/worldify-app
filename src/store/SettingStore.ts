// store/SettingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SettingStore = {
  viewDistance: number;
  shadowsEnabled: boolean;
  setViewDistance: (distance: number) => void;
  setShadowsEnabled: (enabled: boolean) => void;
};

export const useSettingStore = create<SettingStore>()(
  persist(
    (set) => ({
      viewDistance: 50,
      shadowsEnabled: true,
      setViewDistance: (distance) => set({ viewDistance: distance }),
      setShadowsEnabled: (enabled) => set({ shadowsEnabled: enabled }),
    }),
    {
      name: 'setting-store',
    }
  )
);