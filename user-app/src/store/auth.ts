import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setSession: (user: User, token: string) => void;
  setUser: (user: User) => void;
  updateUser: (data: Partial<User>) => void;
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
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'eco-user-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
