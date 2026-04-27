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
