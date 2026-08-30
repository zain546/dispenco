'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authApi } from '@/features/auth/services/auth-api';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  storeName?: string;
  role?: string;
}

interface AuthContextType {
  user: UserSession | null;
  storeName: string;
  isLoading: boolean;
  login: (userData: UserSession, storeName?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'dispenco_auth_user';
const STORE_STORAGE_KEY = 'dispenco_store_name';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedStore = localStorage.getItem(STORE_STORAGE_KEY);

      if (storedUser) {
        const parsed: UserSession = JSON.parse(storedUser);
        setUser(parsed);
        setStoreName(storedStore || parsed.storeName || '');
      } else {
        setUser(null);
        setStoreName('');
      }
    } catch {
      setUser(null);
      setStoreName('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: UserSession, newStoreName?: string) => {
    const finalStoreName = newStoreName || userData.storeName || '';
    const updatedUser = { ...userData, storeName: finalStoreName || undefined };

    setUser(updatedUser);
    setStoreName(finalStoreName);

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    if (finalStoreName) {
      localStorage.setItem(STORE_STORAGE_KEY, finalStoreName);
    } else {
      localStorage.removeItem(STORE_STORAGE_KEY);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout cleanup
    } finally {
      setUser(null);
      setStoreName('');
      Cookies.remove('dispenco_access_token');
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(STORE_STORAGE_KEY);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, storeName, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
