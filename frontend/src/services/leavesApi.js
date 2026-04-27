import api from './api';

export const getLeaves = async () => {
  const response = await api.get('/leaves/me');
  return response.data;
};

export const applyLeave = async (data) => {
  const response = await api.post('/leaves', data);
  return response.data;
};

export const getMyLeaves = getLeaves;
