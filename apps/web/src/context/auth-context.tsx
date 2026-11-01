'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/services/auth-api';
import { setSessionIdentity } from '@/lib/session-identity';
import { sessionAuthorityKey } from '@/lib/auth-policy';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  storeId?: string;
  storeName?: string;
  role?: string;
  permissions?: string[];
}
interface AuthContextType {
  user: UserSession | null;
  storeName: string;
  isLoading: boolean;
  verifiedPath: string | null;
  sessionError: boolean;
  refreshSession: () => Promise<void>;
  login: (user: UserSession, storeName?: string) => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_SIGNAL = 'dispenco_session_changed';
function notifySessionChanged() {
  try {
    localStorage.setItem(SESSION_SIGNAL, crypto.randomUUID());
  } catch {
    /* Storage is optional. */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestVersion = useRef(0);
  const currentAuthority = useRef<string | null>(null);
  const invalidateSessionRequest = useCallback(() => {
    ++requestVersion.current;
  }, []);

  const applyUser = useCallback(
    (next: UserSession | null) => {
      setSessionIdentity(next);
      const authority = sessionAuthorityKey(next);
      if (currentAuthority.current !== authority) queryClient.clear();
      currentAuthority.current = authority;
      setUser(next);
    },
    [queryClient],
  );

  const refreshSession = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const response = await fetch('/api/backend/auth/me', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (version !== requestVersion.current) return;
      setSessionError(false);
      if (response.status === 401) {
        applyUser(null);
        return;
      }
      if (!response.ok) throw new Error('Session unavailable');
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!data.user?.id || !data.user?.tenantId) throw new Error('Invalid session');
      applyUser(data.user);
    } catch {
      if (version === requestVersion.current) {
        applyUser(null);
        setSessionError(true);
      }
    } finally {
      if (version === requestVersion.current) {
        setIsLoading(false);
        setVerifiedPath(pathname);
      }
    }
  }, [applyUser, pathname]);

  useEffect(() => {
    // Remove legacy identity data; only the API establishes identity and permissions.
    try {
      localStorage.removeItem('dispenco_auth_user');
      localStorage.removeItem('dispenco_store_name');
    } catch {
      /* Private browsing may disable storage. */
    }
    // Session state is synchronized from the external auth API, including on navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Updates follow asynchronous session verification.
    void refreshSession();
    const recheck = () => {
      if (document.visibilityState === 'visible') void refreshSession();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === SESSION_SIGNAL) void refreshSession();
    };
    window.addEventListener('dispenco:session-expired', recheck);
    window.addEventListener('focus', recheck);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      invalidateSessionRequest();
      window.removeEventListener('dispenco:session-expired', recheck);
      window.removeEventListener('focus', recheck);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [refreshSession, invalidateSessionRequest]);

  const login = (next: UserSession, storeName?: string) => {
    ++requestVersion.current;
    applyUser({ ...next, storeName: storeName || next.storeName });
    setSessionError(false);
    setIsLoading(false);
    notifySessionChanged();
  };
  const logout = async () => {
    await authApi.logout();
    ++requestVersion.current;
    applyUser(null);
    setVerifiedPath(null);
    try {
      localStorage.removeItem('dispenco_active_store_id');
    } catch {
      /* Storage is optional. */
    }
    notifySessionChanged();
    router.replace('/login');
    router.refresh();
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        storeName: user?.storeName || '',
        isLoading,
        verifiedPath,
        sessionError,
        refreshSession,
        login,
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
