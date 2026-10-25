import { create } from 'zustand';
import api from '../services/api';

interface NotificationState {
  unread: number;
  setUnread: (n: number) => void;
  increment: () => void;
  refresh: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unread: 0,
  setUnread: (unread) => set({ unread }),
  increment: () => set((s) => ({ unread: s.unread + 1 })),
  refresh: async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 1 } });
      set({ unread: data.unread_count });
    } catch {
      // abaikan; badge notifikasi tidak kritis
    }
  },
}));
