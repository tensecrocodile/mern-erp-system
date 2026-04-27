import api from './api';

export const getAnnouncements = () => api.get('/announcements');
export const getAnnouncementById = (id) => api.get(`/announcements/${id}`);
export const createAnnouncement = (data) => api.post('/announcements', data);
export const updateAnnouncement = (id, data) => api.patch(`/announcements/${id}`, data);
export const publishAnnouncement = (id) => api.patch(`/announcements/${id}/publish`);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);
