import api from './api';

export const getProfile = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.patch('/users/me', data);
  return response.data;
};
