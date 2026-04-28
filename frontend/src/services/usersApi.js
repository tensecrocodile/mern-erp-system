import api from './api';

export const getEmployees = (params = {}) =>
  api.get('/users', { params }).then((r) => r.data);

export const createEmployee = (data) =>
  api.post('/users', data).then((r) => r.data);

export const setEmployeeStatus = (id, isActive) =>
  api.patch(`/users/${id}/status`, { isActive }).then((r) => r.data);
