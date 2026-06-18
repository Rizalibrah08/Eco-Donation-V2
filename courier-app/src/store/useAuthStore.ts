import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Courier {
  id: number;
  name: string;
  email: string;
  role?: string;
  phone?: string;
}

interface AuthState {
  user: Courier | null;
  token: string | null;
  login: (user: Courier, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null })
    }),
    {
      name: 'courier-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
