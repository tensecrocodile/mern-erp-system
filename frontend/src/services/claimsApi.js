import api from './api';

export const getClaims = async () => {
  const response = await api.get('/claims/me');
  return response.data;
};

export const createClaim = async (data) => {
  const response = await api.post('/claims', data);
  return response.data;
};

export const getMyClaims = getClaims;
export const submitClaim = createClaim;

export const getAllClaims = async (params = {}) => {
  const response = await api.get('/claims', { params });
  return response.data;
};

export const reviewClaim = async (id, status, comment = '') => {
  const response = await api.patch(`/claims/${id}/review`, { status, reviewComment: comment });
  return response.data;
};
