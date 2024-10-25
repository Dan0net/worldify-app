// store/SessionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SessionStore = {
  userId: string | null;
  userEmail: string | null;
  jwtToken: string | null;
  isLoggedIn: boolean;
  setSession: (userId: string, userEmail: string, jwtToken: string) => void;
  unsetSession: () => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      userId: null,
      userEmail: null,
      jwtToken: null,
      isLoggedIn: false,
      setSession: (userId, userEmail, jwtToken) => 
        set({ jwtToken, userId, userEmail, isLoggedIn: !!jwtToken }),
      unsetSession: () =>
        set({ userId: null, userEmail: null, jwtToken: null, isLoggedIn: false }),
    }),
    {
      name: 'session-store',
    }
  )
);