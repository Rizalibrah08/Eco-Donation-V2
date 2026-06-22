import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

// Gunakan localhost untuk Web/Simulator, atau ganti dengan IP Address laptop Anda untuk physical device.
// PENTING: Ganti IP ini dengan IP laptop kamu (cek dengan ipconfig di CMD)
export const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'
  : 'http://192.168.1.3:3000/api'; // IP laptop kamu

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 Unauthorized (e.g., expired or invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
    }
    return Promise.reject(error);
  }
);

export default api;
