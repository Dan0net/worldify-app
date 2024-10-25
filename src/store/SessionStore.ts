// store/SessionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserData } from '../utils/interfaces';

type SessionStore = {
  userId: string | null;
  userEmail: string | null;
  jwtToken: string | null;
  isLoggedIn: boolean;
  setSession: (userData: UserData) => void;
  unsetSession: () => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      userId: null,
      userEmail: null,
      jwtToken: null,
      isLoggedIn: false,
      setSession: (userData) => 
        set({ 
          jwtToken: userData.token, 
          userId: userData.user.id, 
          userEmail: userData.user.email, 
          isLoggedIn: !!userData.token 
        }),
      unsetSession: () =>
        set({ userId: null, userEmail: null, jwtToken: null, isLoggedIn: false }),
    }),
    {
      name: 'session-store',
    }
  )
);