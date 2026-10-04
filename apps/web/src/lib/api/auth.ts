import { api, tokens } from './client';
import type { AuthTokens, Profile, User } from '@/types/api';
export const authApi = {
  login: (body: { email: string; password: string }) =>
    api<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: {
    email: string;
    password: string;
    firstName: string;
    paternalLastName: string;
  }) => api<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api<User>('/auth/me'),
  logout: async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST' }, false);
    } finally {
      tokens.clear();
    }
  },
  profile: () => api<User>('/users/me'),
  updateProfile: (body: Partial<Profile>) =>
    api<Profile>('/users/me/profile', { method: 'PATCH', body: JSON.stringify(body) }),
};
