import axios from 'axios';
import { Platform } from 'react-native';

export const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'
  : 'http://10.0.2.2:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
