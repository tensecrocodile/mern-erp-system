import api from './api';

export const submitDailyReport = (data) => api.post('/daily-reports', data);
export const getMyReports = (params) => api.get('/daily-reports/me', { params });
export const getAllReports = (params) => api.get('/daily-reports', { params });
export const getReportById = (id) => api.get(`/daily-reports/${id}`);
