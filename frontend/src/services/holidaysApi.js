import api from './api';

export const getHolidays = async () => {
  const response = await api.get('/holidays/me');
  return response.data;
};
