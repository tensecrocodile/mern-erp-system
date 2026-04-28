import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  const { accessToken, user } = response.data?.data ?? {};

  if (accessToken) localStorage.setItem('token', accessToken);
  if (user?.role)  localStorage.setItem('role', user.role);
  if (user?.fullName) localStorage.setItem('name', user.fullName);

  return response.data;
};
