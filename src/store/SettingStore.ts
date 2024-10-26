// store/SettingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SettingStore = {
  viewDistance: number;
  mouseSensitivity: number;
  shadowsEnabled: boolean;
  setViewDistance: (distance: number) => void;
  setShadowsEnabled: (enabled: boolean) => void;
};

export const useSettingStore = create<SettingStore>()(
  persist(
    (set) => ({
      viewDistance: 2,
      mouseSensitivity: 0.0016,
      shadowsEnabled: true,
      setViewDistance: (distance) => set({ viewDistance: distance }),
      setShadowsEnabled: (enabled) => set({ shadowsEnabled: enabled }),
    }),
    {
      name: 'setting-store',
    }
  )
);