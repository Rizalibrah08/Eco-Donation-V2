import io from 'socket.io-client';
import { Platform } from 'react-native';

// PENTING: Pastikan IP ini SAMA dengan yang di api.ts
const SERVER_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://192.168.1.3:3000'; // IP laptop kamu (harus sama dengan api.ts)

let socket: any = null;

export const initSocketConnection = (userId: number, onNotification: (notification: any) => void) => {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    path: '/socket.io/',
    transports: ['polling', 'websocket'], // Coba polling dulu baru websocket
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 5,
    timeout: 20000, // Timeout lebih lama untuk koneksi mobile
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('register_user', userId);
  });

  socket.on('notification', (notification: any) => {
    console.log('Notification received:', notification);
    onNotification(notification);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error: Error) => {
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
