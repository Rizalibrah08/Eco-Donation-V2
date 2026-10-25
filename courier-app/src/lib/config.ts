import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Urutan sumber alamat backend:
// 1. EXPO_PUBLIC_API_URL (file .env) — wajib bila memakai tunnel/ngrok atau server lain.
// 2. Web → localhost.
// 3. Host Metro (IP laptop yang menjalankan `expo start`) → port 3000. Cocok untuk Expo Go di WiFi yang sama.
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (Platform.OS === 'web') return 'http://localhost:3000';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();
