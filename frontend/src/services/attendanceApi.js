import api from './api';

export const uploadSelfie = async (blob) => {
  const form = new FormData();
  form.append('selfie', blob, 'selfie.jpg');
  const response = await api.post('/attendance/selfie', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data?.url;
};

export const checkIn = async (location, selfieUrl) => {
  const response = await api.post('/attendance/check-in', {
    checkInAt: new Date().toISOString(),
    location: {
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy,
      address: location.address || '',
    },
    selfieUrl,
  });

  return response.data;
};

export const checkOut = async (location, selfieUrl) => {
  const response = await api.post('/attendance/check-out', {
    checkOutAt: new Date().toISOString(),
    location: {
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy,
      address: location.address || '',
    },
    selfieUrl,
  });

  return response.data;
};

export const getMyLogs = async (limit = 30) => {
  const response = await api.get('/attendance/logs', { params: { limit } });
  return response.data;
};

export const getAttendanceSummary = async (month) => {
  const params = month ? { month } : {};
  const response = await api.get('/attendance/summary', { params });
  return response.data;
};
