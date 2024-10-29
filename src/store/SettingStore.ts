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
  keys_down: {
    move_forward: string,
    move_backward: string,
    move_left: string,
    move_right: string,
    jump: string,
  },
  keys_press: {
    next_item: string,
    prev_item: string,
    next_material: string,
    prev_material: string
  }
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
      keys_down: {
        move_forward: 'KeyW',
        move_backward: 'KeyS',
        move_left: 'KeyA',
        move_right: 'KeyD',
        jump: 'Space',
        run: 'ShiftLeft'
      },
      keys_press: {
        next_item: 'KeyE',
        prev_item: 'KeyQ',
        next_material: 'KeyC',
        prev_material: 'KeyZ',
        snap_object: 'KeyT',
        snap_grid: 'KeyR'
      }
    }),
    {
      name: 'setting-store',
    }
  )
);