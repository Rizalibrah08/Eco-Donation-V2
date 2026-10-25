import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Courier } from '../lib/types';

interface AuthState {
  user: Courier | null;
  token: string | null;
  hydrated: boolean;
  setSession: (user: Courier, token: string) => void;
  setUser: (user: Courier) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setSession: (user, token) => set({ user, token }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'eco-courier-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
