import axios from 'axios';
import { Platform } from 'react-native';

// Gunakan localhost untuk Web/Simulator, atau ganti dengan IP Address laptop Anda untuk physical device.
export const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'
  : 'http://10.0.2.2:3000/api'; // 10.0.2.2 is default for Android Emulator. Change to local IP if testing on real device.

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
