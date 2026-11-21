'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Database,
  ArrowUpRight,
  Clock,
  RotateCcw,
  Loader2,
  Layers,
  ShieldAlert,
  XCircle,
  PackageCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { posLocalDataService, LocalSyncStatus } from '../services/pos-local-data.service';
import { OfflineSaleRecord } from '../db/pos-db';
import { useStore } from '@/context/store-context';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OfflineSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete?: () => void;
  isOnline?: boolean;
}

export function OfflineSyncModal({
  open,
  onOpenChange,
  onSyncComplete,
  isOnline: externalIsOnline,
}: OfflineSyncModalProps) {
  const queryClient = useQueryClient();
  const { activeStoreId, isAllStores } = useStore();
  const [records, setRecords] = useState<OfflineSaleRecord[]>([]);
  const [status, setStatus] = useState<LocalSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState(false);
  const [internalIsOnline, setInternalIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  const isOnline = externalIsOnline !== undefined ? externalIsOnline : internalIsOnline;

  const checkConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setInternalIsOnline(false);
      return false;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/backend/auth/me', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      const online = res.status < 500;
      setInternalIsOnline(online);
      return online;
    } catch {
      setInternalIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        setInternalIsOnline(true);
        void checkConnectivity();
      };
      const handleOffline = () => setInternalIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('dispenco:network-offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('dispenco:network-offline', handleOffline);
      };
    }
  }, [checkConnectivity]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesData, syncStatus] = await Promise.all([
        posLocalDataService.getAllOfflineSales(),
        posLocalDataService.getStatus(),
      ]);
      setRecords(salesData);
      setStatus(syncStatus);
    } catch (err) {
      console.error('Failed to load offline data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSyncCatalog = async () => {
    if (!isOnline) {
      toast.error('Network connection required to refresh local catalog cache.');
      return;
    }

    setIsCatalogSyncing(true);
    try {
      const targetStore = !isAllStores && activeStoreId ? activeStoreId : undefined;
      const res = await posLocalDataService.syncCatalogToLocal(targetStore, { force: true });
      toast.success(`Local catalog cache updated! (${res.count} products cached)`);
      setInternalIsOnline(true);
      await loadData();
    } catch {
      setInternalIsOnline(false);
      toast.error('Failed to sync catalog to local database. Server is unreachable.');
    } finally {
      setIsCatalogSyncing(false);
    }
  };

  const handleSyncAllSales = useCallback(async () => {
    if (!isOnline) {
      toast.error('Network connection required to sync offline transactions.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await posLocalDataService.syncPendingSales();
      if (res.successCount > 0) {
        toast.success(`Successfully synced ${res.successCount} offline transaction(s)!`);
        setInternalIsOnline(true);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
      if (res.conflictCount > 0) {
        toast.warning(`${res.conflictCount} sale(s) encountered inventory conflicts during sync.`);
      }
      if (res.errorCount > 0 && res.successCount === 0) {
        setInternalIsOnline(false);
        toast.error('Could not reach backend API server. Will retry when connection stabilizes.');
      }
      await loadData();
      if (onSyncComplete) onSyncComplete();
    } catch {
      setInternalIsOnline(false);
      toast.error('Failed to execute offline sales sync. Device appears offline.');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, queryClient, loadData, onSyncComplete]);

  useEffect(() => {
    if (open) {
      loadData();
      void checkConnectivity().then((online) => {
        if (online) {
          posLocalDataService.getStatus().then((st) => {
            if (st.pendingSalesCount > 0) {
              void handleSyncAllSales();
            }
          });
        }
      });
    }
  }, [open, loadData, checkConnectivity, handleSyncAllSales]);

  const handleResolveConflict = async (id: number, resolution: 'OVERRIDE_ADJUST' | 'CANCEL') => {
    const success = await posLocalDataService.resolveConflict(id, resolution);
    if (success && resolution === 'OVERRIDE_ADJUST') {
      toast.success('Successfully resolved and synced conflict transaction.');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
    await loadData();
    if (onSyncComplete) onSyncComplete();
  };

  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  const confirmDeleteRecord = async () => {
    if (recordToDelete !== null) {
      await posLocalDataService.deleteRecord(recordToDelete);
      toast.info('Offline transaction record removed');
      await loadData();
      if (onSyncComplete) onSyncComplete();
      setRecordToDelete(null);
    }
  };

  const handleClearSynced = async () => {
    await posLocalDataService.clearSyncedRecords();
    toast.success('Cleaned up synced offline records');
    await loadData();
  };

  const pendingCount = records.filter((r) => r.status === 'pending_sync').length;
  const conflictCount = records.filter((r) => r.status === 'conflict').length;
  const syncedCount = records.filter((r) => r.status === 'synced').length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-2xl max-h-[85vh] flex flex-col p-3.5 sm:p-5 overflow-hidden rounded-2xl sm:rounded-xl gap-2.5 sm:gap-3.5 shadow-2xl border-border/80">
          <DialogHeader className="pr-10">
            <div className="flex items-center gap-2.5">
              <div className="size-8 sm:size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                <Database className="size-4 sm:size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
                    <span className="sm:hidden">Offline Queue</span>
                    <span className="hidden sm:inline">Local-First POS &amp; Offline Queue</span>
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={`text-micro font-medium px-2 py-0.5 rounded-full ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                    }`}
                  >
                    ● {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <DialogDescription className="text-micro text-muted-foreground mt-0.5 line-clamp-1">
                  <span className="sm:hidden">Offline catalog &amp; transaction sync</span>
                  <span className="hidden sm:inline">IndexedDB local catalog cache &amp; opportunistic sync with cloud</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Local Catalog Cache Strip */}
          <div className="px-3 py-2 sm:py-2.5 bg-card rounded-xl border border-border/70 shadow-2xs flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                <PackageCheck className="size-3.5" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-foreground text-xs">Catalog:</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {status ? `${status.cachedProductsCount} items` : 'Loading...'}
                </span>
                {status?.lastSyncedAt && (
                  <span className="text-micro text-muted-foreground/70 hidden xs:inline font-mono">
                    • {new Date(status.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCatalog}
              disabled={!isOnline || isCatalogSyncing}
              className="h-7 px-2.5 text-xs font-medium gap-1 shrink-0 rounded-lg border-border/80 bg-background hover:bg-muted/60 text-foreground cursor-pointer shadow-2xs transition-colors"
            >
              <RefreshCw className={`size-3 ${isCatalogSyncing ? 'animate-spin' : ''}`} />
              <span>{isCatalogSyncing ? 'Syncing...' : 'Update'}</span>
            </Button>
          </div>

          {/* 3-Column Minimalist Metrics Bar */}
          <div className="grid grid-cols-3 divide-x divide-border/60 rounded-xl border border-border/70 bg-card p-2 text-center shadow-2xs">
            <div className="px-1 space-y-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Pending</span>
              <span className={`font-mono font-bold text-base sm:text-lg block tabular-nums leading-none pt-0.5 ${pendingCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                {pendingCount}
              </span>
            </div>
            <div className="px-1 space-y-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Conflicts</span>
              <span className={`font-mono font-bold text-base sm:text-lg block tabular-nums leading-none pt-0.5 ${conflictCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                {conflictCount}
              </span>
            </div>
            <div className="px-1 space-y-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Synced</span>
              <span className={`font-mono font-bold text-base sm:text-lg block tabular-nums leading-none pt-0.5 ${syncedCount > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                {syncedCount}
              </span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-1 divide-y divide-border/60">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading local IndexedDB transaction queue...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="py-6 sm:py-8 text-center text-muted-foreground space-y-2 flex flex-col items-center justify-center">
                <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs sm:text-sm text-foreground">Queue Clean</p>
                  <p className="text-micro text-muted-foreground">All checkouts synchronized with cloud.</p>
                </div>
              </div>
            ) : (
              records.map((rec) => (
                <div key={rec.id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-xs text-foreground">{rec.localReceiptNumber}</span>
                      {rec.clientTxId && (
                        <span className="font-mono text-micro text-muted-foreground bg-muted/60 border border-border/60 px-1.5 py-0.5 rounded">
                          UUID: {rec.clientTxId.slice(0, 8)}...
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-micro font-medium px-2 py-0.5 rounded-full ${
                          rec.status === 'pending_sync'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                            : rec.status === 'conflict'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                        }`}
                      >
                        {rec.status === 'pending_sync' ? 'Pending Sync' : rec.status === 'conflict' ? 'Stock Conflict' : 'Synced'}
                      </Badge>
                      <span className="text-xs font-semibold font-mono tabular-nums text-foreground">{rec.totals.grandTotal.toFixed(2)} PKR</span>
                    </div>

                    <p className="text-micro text-muted-foreground">
                      Items: {rec.payload.items.length} • Payment: {rec.payload.paymentMethod} • Date:{' '}
                      {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {rec.errorReason && (
                      <div className="flex items-start gap-1.5 text-micro text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg mt-1">
                        <ShieldAlert className="size-3.5 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Conflict: </span>
                          <span>{rec.errorReason}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0">
                    {rec.status === 'conflict' && rec.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveConflict(rec.id!, 'OVERRIDE_ADJUST')}
                          disabled={!isOnline || isSyncing}
                          className="h-7 px-2 text-micro gap-1 border-warning/40 text-warning hover:bg-warning/10"
                          title="Retry sync and allow batch adjustment"
                        >
                          <RotateCcw className="size-3" />
                          <span>Force Sync</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveConflict(rec.id!, 'CANCEL')}
                          className="h-7.5 px-2.5 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer font-medium"
                          title="Cancel sale and restore local stock"
                        >
                          <XCircle className="size-3" />
                          <span>Cancel</span>
                        </Button>
                      </div>
                    )}

                    {rec.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRecordToDelete(rec.id!)}
                        className="size-7.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete record from queue"
                        aria-label="Delete offline record"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border/70 pt-2.5 shrink-0">
            {syncedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSynced}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 rounded-lg cursor-pointer font-medium"
              >
                Clear ({syncedCount})
              </Button>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8.5 px-3 text-xs font-medium rounded-lg border-border/80 bg-card hover:bg-muted/60 text-foreground cursor-pointer flex-1 sm:flex-initial shadow-2xs"
              >
                Close
              </Button>

              <Button
                size="sm"
                onClick={handleSyncAllSales}
                disabled={!isOnline || isSyncing || pendingCount === 0}
                className={`h-8.5 px-3 text-xs font-semibold gap-1.5 rounded-lg transition-all flex-1 sm:flex-initial shadow-2xs ${
                  !isOnline || isSyncing || pendingCount === 0
                    ? 'bg-muted/80 text-muted-foreground border border-border/80 cursor-not-allowed opacity-80'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(20,184,166,0.3)] cursor-pointer'
                }`}
              >
                <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  <span className="sm:hidden">{isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}</span>
                  <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : `Sync All Pending (${pendingCount})`}</span>
                </span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={recordToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setRecordToDelete(null)}
        title="Remove Offline Transaction Log"
        description="Are you sure you want to remove this offline transaction log from IndexedDB? If it has not synced, the sale data will be lost."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmDeleteRecord}
      />
    </>
  );
}
