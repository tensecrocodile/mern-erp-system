import api from './api';

export const getActiveTripsFeed = () =>
  api.get('/trips/live').then((r) => r.data);
