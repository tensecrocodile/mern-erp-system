import api from './api';

export const createMeeting = async (data) => {
  const response = await api.post('/meetings', data);
  return response.data;
};

export const getMyMeetings = async () => {
  const response = await api.get('/meetings/me');
  return response.data;
};

export const getAllMeetings = async () => {
  const response = await api.get('/meetings');
  return response.data;
};
