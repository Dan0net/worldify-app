// store/SettingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VIEW_DISTANCE_MAX, VIEW_DISTANCE_MIN } from '../utils/constants';

type SettingStore = {
  viewDistance: number;
  mouseSensitivity: number;
  firstPerson: boolean;
  shadowsEnabled: boolean;
  setViewDistance: (distance: number) => void;
  setShadowsEnabled: (enabled: boolean) => void;
};

export const useSettingStore = create<SettingStore>()(
  persist(
    (set) => ({
      viewDistance: 2,
      mouseSensitivity: 0.0016,
      firstPerson: true,
      shadowsEnabled: true,
      setViewDistance: (distance) => set({ viewDistance: Math.max(Math.min(distance, VIEW_DISTANCE_MAX), VIEW_DISTANCE_MIN) }),
      setShadowsEnabled: (enabled) => set({ shadowsEnabled: enabled }),
    }),
    {
      name: 'setting-store',
    }
  )
);