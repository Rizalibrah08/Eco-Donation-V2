import io from 'socket.io-client';
import { Platform } from 'react-native';

const SERVER_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  // : 'http://10.0.2.2:3000'; // Android Emulator
  : 'http://192.168.1.7:3000'; // Physical device IP

let socket: any = null;

export const initSocketConnection = (userId: number, onNotification: (notification: any) => void) => {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 3,
    timeout: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('register_user', userId);
  });

  socket.on('notification', (notification) => {
    console.log('Notification received:', notification);
    onNotification(notification);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
