'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

const DEFAULT_USER: UserSession = {
  id: 'demo-user-1',
  email: 'owner@pharmacy.com',
  name: 'Owner Pharmacy',
  tenantId: 'demo-tenant-1',
  storeName: 'Main Branch — Blue Area',
  role: 'Owner',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'dispenco_auth_user';
const STORE_STORAGE_KEY = 'dispenco_store_name';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [storeName, setStoreName] = useState<string>('Main Branch — Blue Area');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedStore = localStorage.getItem(STORE_STORAGE_KEY);

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.storeName) {
          setStoreName(parsed.storeName);
        }
      } else {
        setUser(DEFAULT_USER);
        setStoreName(DEFAULT_USER.storeName || 'Main Branch — Blue Area');
      }

      if (storedStore) {
        setStoreName(storedStore);
      }
    } catch {
      setUser(DEFAULT_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: UserSession, newStoreName?: string) => {
    const finalStoreName = newStoreName || userData.storeName || 'Main Branch — Blue Area';
    const updatedUser = { ...userData, storeName: finalStoreName };

    setUser(updatedUser);
    setStoreName(finalStoreName);

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    localStorage.setItem(STORE_STORAGE_KEY, finalStoreName);
  };

  const logout = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout cleanup
    } finally {
      setUser(null);
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
