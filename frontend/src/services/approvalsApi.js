import api from './api';

export const getApprovals = async () => {
  const response = await api.get('/approvals');
  return response.data;
};

const toReviewAction = (value) => {
  if (value === 'approved') return 'approve';
  if (value === 'rejected') return 'reject';
  return value;
};

export const reviewClaim = async (id, action, comment = '') => {
  const response = await api.patch(`/claims/${id}/review`, { action: toReviewAction(action), comment });
  return response.data;
};

export const reviewLeave = async (id, action, comment = '') => {
  const response = await api.patch(`/leaves/${id}/review`, { action: toReviewAction(action), comment });
  return response.data;
};
