import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: true,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const login = useCallback((token: string) => {
    localStorage.setItem('token', token);
    setState(prev => ({ ...prev, token, isAuthenticated: true }));
  }, []);

  const setUser = useCallback((user: User) => {
    setState(prev => ({ ...prev, user, isLoading: false }));
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (state.token && !state.user) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${state.token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setState(prev => ({ ...prev, user: userData, isLoading: false }));
          } else {
            logout();
          }
        } catch (error) {
          logout();
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, [state.token, state.user, logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
