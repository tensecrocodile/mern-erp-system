import api from './api';

export const getMyNotifications = async () => {
  const response = await api.get('/notifications/me');
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};
