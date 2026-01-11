import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLocalUser: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setLocalUser: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLocalUser: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true, isLocalUser: false }),
      setLocalUser: () => {
        const localUser: User = {
          id: `local-${crypto.randomUUID()}`,
          name: 'Local User',
          email: '',
        };
        set({ user: localUser, accessToken: null, isAuthenticated: true, isLocalUser: true });
      },
      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, isLocalUser: false }),
    }),
    {
      name: 'habitly-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        isLocalUser: state.isLocalUser,
      }),
    }
  )
);
