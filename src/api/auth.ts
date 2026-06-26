import client from './client';
import type { LoginPayload, LoginResponse } from '@/lib/types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await client.post<LoginResponse>('/user/login', payload);
    return data;
  },
};
