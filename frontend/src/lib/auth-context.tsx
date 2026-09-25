'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { User } from './api';

export interface AuthContextType {
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
    const savedUser = localStorage.getItem('aimms_user');
    const savedToken = localStorage.getItem('aimms_token');

    if (savedToken && savedUser && savedUser !== 'undefined' && savedUser.trim() !== '') {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
      } catch {
        localStorage.removeItem('aimms_token');
        localStorage.removeItem('aimms_user');
        setUser(null);
        setToken(null);
      }
    } else {
      setUser(null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, pass });
    const { accessToken, user: authenticatedUser } = res.data;

    localStorage.setItem('aimms_token', accessToken);
    localStorage.setItem('aimms_user', JSON.stringify(authenticatedUser));

    setToken(accessToken);
    setUser(authenticatedUser);
  };

  const register = async (name: string, email: string, pass: string, role?: string) => {
    const res = await api.post('/auth/register', { name, email, pass, role });
    const { accessToken, user: registeredUser } = res.data;

    localStorage.setItem('aimms_token', accessToken);
    localStorage.setItem('aimms_user', JSON.stringify(registeredUser));

    setToken(accessToken);
    setUser(registeredUser);
  };

  const logout = () => {
    localStorage.removeItem('aimms_token');
    localStorage.removeItem('aimms_user');
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
