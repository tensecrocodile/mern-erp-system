import api from './api';

export const getGeofences = (params = {}) =>
  api.get('/geofences', { params }).then((r) => r.data);

export const getGeofenceById = (id) =>
  api.get(`/geofences/${id}`).then((r) => r.data);

export const createGeofence = (data) =>
  api.post('/geofences', data).then((r) => r.data);

export const updateGeofence = (id, data) =>
  api.patch(`/geofences/${id}`, data).then((r) => r.data);

export const deleteGeofence = (id) =>
  api.delete(`/geofences/${id}`).then((r) => r.data);

export const assignGeofenceUsers = (id, userIds) =>
  api.post(`/geofences/${id}/assign`, { userIds }).then((r) => r.data);

export const getMyGeofences = () =>
  api.get('/geofences/my').then((r) => r.data);
