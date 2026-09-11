import axiosClient from './axiosClient';

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  getCurrentUser: () => axiosClient.get('/auth/me'),
  logout: () => axiosClient.post('/auth/logout'),
};
