import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Notification {
  id?: string;
  type: string;
  title: string;
  message: string;
  orderId?: number;
  timestamp: string;
}

interface NotificationState {
  notifications: Notification[];
  currentNotification: Notification | null;
  addNotification: (notification: Notification) => void;
  setCurrentNotification: (notification: Notification | null) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      currentNotification: null,
      addNotification: (notification) =>
        set((state) => {
          const newNotifications = [notification, ...state.notifications].slice(0, 20);
          return {
            notifications: newNotifications,
            currentNotification: notification,
          };
        }),
      setCurrentNotification: (notification) =>
        set({ currentNotification: notification }),
      clearNotifications: () =>
        set({ notifications: [], currentNotification: null }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
