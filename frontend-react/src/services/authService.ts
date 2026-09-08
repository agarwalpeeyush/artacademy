import api from './api';
import { LoginRequest, LoginResponse } from '../types';

const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<any>('/auth/login', credentials);
    const data = response.data?.data ?? response.data;
    const roles: string[] = (data.roles ?? []).map((r: string) =>
      r.startsWith('ROLE_') ? r : `ROLE_${r}`
    );
    return {
      token: data.accessToken ?? data.token,
      id: data.id ?? '',
      username: data.username ?? credentials.username,
      email: data.email ?? '',
      roles,
    };
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  refreshToken: async (): Promise<LoginResponse> => {
    const response = await api.post<any>('/auth/refresh');
    const data = response.data?.data ?? response.data;
    const roles: string[] = (data.roles ?? []).map((r: string) =>
      r.startsWith('ROLE_') ? r : `ROLE_${r}`
    );
    return {
      token: data.accessToken ?? data.token,
      id: data.id ?? '',
      username: data.username ?? '',
      email: data.email ?? '',
      roles,
    };
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  },
};

export default authService;
