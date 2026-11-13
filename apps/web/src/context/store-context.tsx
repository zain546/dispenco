'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storesApi, StoreData, CreateStorePayload } from '@/lib/stores-api';
import { useAuth } from './auth-context';
import { toast } from 'sonner';

interface StoreContextType {
  stores: StoreData[];
  activeStoreId: string;
  activeStore: StoreData | null;
  isAllStores: boolean;
  isMultiStore: boolean;
  storeCount: number;
  isLoading: boolean;
  isStoreReady: boolean;
  setActiveStoreId: (storeId: string) => void;
  refreshStores: () => Promise<void>;
  createStore: (payload: CreateStorePayload) => Promise<StoreData | null>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const ACTIVE_STORE_STORAGE_KEY = 'dispenco_active_store_id';
const CACHED_STORES_STORAGE_KEY = 'dispenco_cached_stores';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStores = useCallback(async () => {
    if (!user) {
      setStores([]);
      setActiveStoreIdState('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await storesApi.getStores();
      if (res && res.data) {
        const activeList = res.data.filter((s) => s.isActive);
        setStores(activeList);
        try {
          localStorage.setItem(CACHED_STORES_STORAGE_KEY, JSON.stringify(activeList));
        } catch {
          /* Storage is optional */
        }

        // Determine active store ID
        const storedId = localStorage.getItem(ACTIVE_STORE_STORAGE_KEY);
        if (storedId === 'all' && activeList.length > 1) {
          setActiveStoreIdState('all');
        } else if (storedId && activeList.some((s) => s.id === storedId)) {
          setActiveStoreIdState(storedId);
        } else if (user.storeId && activeList.some((s) => s.id === user.storeId)) {
          setActiveStoreIdState(user.storeId);
          localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, user.storeId);
        } else if (activeList.length > 0) {
          setActiveStoreIdState(activeList[0].id);
          localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, activeList[0].id);
        } else {
          setActiveStoreIdState('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch stores list (attempting offline fallback):', err);
      // Offline fallback: load cached stores from localStorage
      try {
        const cached = localStorage.getItem(CACHED_STORES_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as StoreData[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStores(parsed);
            const storedId = localStorage.getItem(ACTIVE_STORE_STORAGE_KEY);
            if (storedId && (storedId === 'all' || parsed.some((s) => s.id === storedId))) {
              setActiveStoreIdState(storedId);
            } else if (user.storeId && parsed.some((s) => s.id === user.storeId)) {
              setActiveStoreIdState(user.storeId);
            } else {
              setActiveStoreIdState(parsed[0].id);
            }
          }
        }
      } catch {
        /* Storage is optional */
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchStores();
    }
  }, [authLoading, fetchStores]);

  // Re-fetch stores automatically when reconnected
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      void fetchStores();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchStores]);

  // Safeguard: if activeStoreId is set to an ID that no longer exists in stores, fall back
  useEffect(() => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (!isLoading && stores.length > 0 && activeStoreId !== 'all' && !stores.some((s) => s.id === activeStoreId)) {
      const fallbackId = stores[0].id;
      setActiveStoreIdState(fallbackId);
      localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, fallbackId);
    } else if (!isLoading && stores.length === 0 && activeStoreId !== '' && !isOffline) {
      // Do not wipe activeStoreId when merely offline
      setActiveStoreIdState('');
      localStorage.removeItem(ACTIVE_STORE_STORAGE_KEY);
    }
  }, [stores, activeStoreId, isLoading]);

  const setActiveStoreId = (storeId: string) => {
    if (storeId === 'all' || stores.some((s) => s.id === storeId) || !storeId) {
      setActiveStoreIdState(storeId);
      if (storeId) {
        localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeId);
      } else {
        localStorage.removeItem(ACTIVE_STORE_STORAGE_KEY);
      }
    }
  };

  const createStore = async (payload: CreateStorePayload): Promise<StoreData | null> => {
    try {
      const res = await storesApi.createStore(payload);
      if (res?.data) {
        toast.success(`Store branch "${res.data.name}" created successfully!`);
        await fetchStores();
        setActiveStoreId(res.data.id);
        return res.data;
      }
      return null;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create store branch';
      toast.error(msg);
      throw err;
    }
  };

  const activeStore = activeStoreId === 'all'
    ? null
    : stores.find((s) => s.id === activeStoreId) || null;

  const isAllStores = activeStoreId === 'all';
  const isStoreReady = !isLoading && (Boolean(activeStoreId) || stores.length === 0);

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStoreId,
        activeStore,
        isAllStores,
        isMultiStore: stores.length > 1,
        storeCount: stores.length,
        isLoading,
        isStoreReady,
        setActiveStoreId,
        refreshStores: fetchStores,
        createStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
