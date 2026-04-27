import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  const token = response.data?.data?.accessToken;
  const role = response.data?.data?.user?.role;

  if (token) {
    localStorage.setItem('token', token);
  }
  if (role) {
    localStorage.setItem('role', role);
  }

  return response.data;
};
