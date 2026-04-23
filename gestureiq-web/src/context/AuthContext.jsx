// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../utils/constants';

// Centralized Axios Configuration
axios.defaults.baseURL = BASE_URL;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);
    }
    
    // Global Axios Response Interceptor to handle 401s (Expired Tokens)
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
          window.location.href = '/login'; // Force redirect to login
        }
        return Promise.reject(error);
      }
    );

    setLoading(false);
    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    axios.defaults.headers.common['x-auth-token'] = token;
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['x-auth-token'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);