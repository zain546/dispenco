'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/services/auth-api';
import { setSessionIdentity } from '@/lib/session-identity';
import { isProtectedPath, sessionAuthorityKey } from '@/lib/auth-policy';

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
  verifiedPath?: string | null;
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
  const [sessionError, setSessionError] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestVersion = useRef(0);
  const userRef = useRef<UserSession | null>(null);
  const currentAuthority = useRef<string | null>(null);
  const invalidateSessionRequest = useCallback(() => {
    ++requestVersion.current;
  }, []);

  const applyUser = useCallback(
    (next: UserSession | null) => {
      userRef.current = next;
      setSessionIdentity(next);
      const authority = sessionAuthorityKey(next);
      if (currentAuthority.current !== authority) queryClient.clear();
      currentAuthority.current = authority;
      setUser(next);
      if (typeof window !== 'undefined') {
        try {
          if (next) {
            localStorage.setItem(
              'dispenco_offline_session',
              JSON.stringify({ user: next, timestamp: Date.now() }),
            );
          } else {
            localStorage.removeItem('dispenco_offline_session');
          }
        } catch {
          /* Storage is optional */
        }
      }
    },
    [queryClient],
  );

  const refreshSession = useCallback(async () => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      if (userRef.current) {
        // Active session already in memory; retain it during offline state
        setSessionError(false);
        setIsLoading(false);
        return;
      }
      // Check offline session snapshot
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('dispenco_offline_session');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (
              parsed?.user?.id &&
              parsed?.user?.tenantId &&
              Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000
            ) {
              applyUser(parsed.user);
              setSessionError(false);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          /* Storage is optional */
        }
      }
      if (!userRef.current) {
        setSessionError(true);
        setIsLoading(false);
      }
      return;
    }

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
        if (
          typeof window !== 'undefined' &&
          isProtectedPath(window.location.pathname)
        ) {
          router.replace('/login');
        }
        return;
      }
      if (!response.ok) throw new Error('Session unavailable');
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!data.user?.id || !data.user?.tenantId) throw new Error('Invalid session');
      applyUser(data.user);
    } catch (err) {
      if (version === requestVersion.current) {
        const isNetworkFailure =
          typeof navigator !== 'undefined' && (!navigator.onLine || err instanceof TypeError);

        if (isNetworkFailure && userRef.current) {
          // Preserve in-memory user session during network disconnects (especially on POS)
          setSessionError(false);
        } else if (isNetworkFailure && typeof window !== 'undefined') {
          try {
            const cached = localStorage.getItem('dispenco_offline_session');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (
                parsed?.user?.id &&
                parsed?.user?.tenantId &&
                Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000
              ) {
                applyUser(parsed.user);
                setSessionError(false);
                return;
              }
            }
          } catch {
            /* Storage is optional */
          }
          applyUser(null);
          setSessionError(true);
        } else {
          applyUser(null);
          setSessionError(true);
        }
      }
    } finally {
      if (version === requestVersion.current) {
        setIsLoading(false);
      }
    }
  }, [applyUser, router]);

  useEffect(() => {
    // Remove legacy identity data; only the API establishes identity and permissions.
    try {
      localStorage.removeItem('dispenco_auth_user');
      localStorage.removeItem('dispenco_store_name');
    } catch {
      /* Private browsing may disable storage. */
    }
    // Synchronize session state on mount and tab focus
    void refreshSession();
    const recheck = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (document.visibilityState === 'visible') void refreshSession();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === SESSION_SIGNAL) void refreshSession();
    };

    const handleOnline = () => {
      void refreshSession();
    };

    // Periodic silent keep-alive check every 15 minutes to guarantee uninterrupted session
    const keepAlive = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (document.visibilityState === 'visible') void refreshSession();
    }, 15 * 60 * 1000);

    window.addEventListener('dispenco:session-expired', recheck);
    window.addEventListener('focus', recheck);
    window.addEventListener('storage', storage);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      invalidateSessionRequest();
      clearInterval(keepAlive);
      window.removeEventListener('dispenco:session-expired', recheck);
      window.removeEventListener('focus', recheck);
      window.removeEventListener('storage', storage);
      window.removeEventListener('online', handleOnline);
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
    try {
      await authApi.logout();
    } catch {
      /* Ignore network failures during logout */
    }
    ++requestVersion.current;
    applyUser(null);
    try {
      localStorage.removeItem('dispenco_active_store_id');
      localStorage.removeItem('dispenco_offline_session');
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
