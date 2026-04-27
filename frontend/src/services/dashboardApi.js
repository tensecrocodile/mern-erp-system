import api from './api';

export const getAdminDashboard = async () => {
  const response = await api.get('/dashboard/admin');
  return response.data;
};

export const getMyDashboard = async () => {
  const response = await api.get('/dashboard/me');
  return response.data;
};

export const getLiveTrips = async () => {
  const response = await api.get('/trips/live');
  return response.data;
};
