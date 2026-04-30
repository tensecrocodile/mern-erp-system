import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const readLocalAuth = () => ({
  token: localStorage.getItem('token') || null,
  role:  localStorage.getItem('role')  || null,
  name:  localStorage.getItem('name')  || null,
});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readLocalAuth);

  const setSession = useCallback((token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role',  user.role);
    localStorage.setItem('name',  user.fullName || user.name || '');
    setAuth({ token, role: user.role, name: user.fullName || user.name || '' });
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setAuth({ token: null, role: null, name: null });
  }, []);

  return (
    <AuthContext.Provider value={{
      token:           auth.token,
      role:            auth.role,
      name:            auth.name,
      isAuthenticated: !!auth.token,
      setSession,
      clearSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
