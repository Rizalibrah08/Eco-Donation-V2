import api from './api';
import { useAuthStore } from '../store/auth';
import type { User } from '../lib/types';

// Ambil profil terbaru (poin, statistik, lencana) dan simpan ke store.
export async function refreshMe(): Promise<User | null> {
  try {
    const { data } = await api.get<User>('/users/me');
    useAuthStore.getState().setUser(data);
    return data;
  } catch {
    return null;
  }
}
