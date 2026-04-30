import api from './api';

export const loginRequest = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { accessToken, user } = response.data?.data ?? {};
  return { token: accessToken, user };
};
