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

export const getAllLeaves = async (params = {}) => {
  const response = await api.get('/leaves', { params });
  return response.data;
};

export const reviewLeave = async (id, status, comment = '') => {
  const response = await api.patch(`/leaves/${id}/review`, { status, reviewComment: comment });
  return response.data;
};
