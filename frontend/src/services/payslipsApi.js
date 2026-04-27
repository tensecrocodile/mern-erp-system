import api from './api';

export const uploadPayslip = (data) => api.post('/payslips', data);
export const getMyPayslips = () => api.get('/payslips/me');
export const getAllPayslips = (params) => api.get('/payslips', { params });
export const getPayslipById = (id) => api.get(`/payslips/${id}`);
