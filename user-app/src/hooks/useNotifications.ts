import { useEffect } from 'react';
import { initSocketConnection, disconnectSocket } from '../services/socketService';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';

export const useNotifications = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    const handleNotification = (notification: any) => {
      addNotification({
        id: `${notification.orderId}_${notification.type}`,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        orderId: notification.orderId,
        timestamp: notification.timestamp,
      });
    };

    // Initialize socket connection
    initSocketConnection(user.id, handleNotification);

    return () => {
      disconnectSocket();
    };
  }, [user, addNotification]);
};
