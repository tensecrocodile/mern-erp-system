import api from './api';

export const getApprovals = async () => {
  const response = await api.get('/approvals');
  return response.data;
};

export const reviewClaim = async (id, status, comment = '') => {
  const response = await api.patch(`/claims/${id}/review`, { status, comment });
  return response.data;
};

export const reviewLeave = async (id, status, comment = '') => {
  const response = await api.patch(`/leaves/${id}/review`, { status, comment });
  return response.data;
};
