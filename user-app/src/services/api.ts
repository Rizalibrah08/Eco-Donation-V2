import axios from 'axios';
import { API_URL } from '../lib/config';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

// Pesan error yang ramah pengguna dari respons backend ({ error: { code, message } }).
export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  const err = error as { response?: { data?: { error?: { message?: string } } }; request?: unknown; code?: string };
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.code === 'ECONNABORTED') return 'Server terlalu lama merespons. Periksa koneksi Anda.';
  if (err?.request && !err.response) return 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan perangkat satu jaringan.';
  return fallback;
}

export function getErrorCode(error: unknown): string | undefined {
  return (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
}

export default api;
