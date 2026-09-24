'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { User } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('aimms_token');
    if (savedToken) {
      setToken(savedToken);
      api
        .get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('aimms_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, pass });
    localStorage.setItem('aimms_token', res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, pass: string, role?: string) => {
    const res = await api.post('/auth/register', { name, email, pass, role });
    localStorage.setItem('aimms_token', res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('aimms_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
