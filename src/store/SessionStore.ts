// store/SessionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SessionStore = {
  username: string | null;
  jwtToken: string | null;
  isLoggedIn: boolean;
  setJwtToken: (token: string) => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      username: null,
      jwtToken: null,
      isLoggedIn: false,
      setJwtToken: (token) => set({ jwtToken: token, isLoggedIn: !!token }),
    }),
    {
      name: 'session-store',
    }
  )
);