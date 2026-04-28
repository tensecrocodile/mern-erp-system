import api from './api';

export const getAdminDashboard = async () => {
  const response = await api.get('/dashboard/admin');
  return response.data;
};

export const getMyDashboard = async () => {
  const response = await api.get('/dashboard/me');
  return response.data;
};

export const getLiveTracking = async () => {
  const response = await api.get('/tracking/live');
  return response.data;
};
