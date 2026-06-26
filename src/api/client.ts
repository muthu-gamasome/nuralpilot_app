import axios from 'axios';
import storage from '@/lib/storage';

const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:4000'}/api/v1`;

const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });

client.interceptors.request.use(async (config) => {
  const token = await storage.getItem<string>('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
