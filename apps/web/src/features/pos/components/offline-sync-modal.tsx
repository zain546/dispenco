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
import { toast } from 'sonner';

interface OfflineSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete?: () => void;
}

export function OfflineSyncModal({ open, onOpenChange, onSyncComplete }: OfflineSyncModalProps) {
  const { activeStoreId, isAllStores } = useStore();
  const [records, setRecords] = useState<OfflineSaleRecord[]>([]);
  const [status, setStatus] = useState<LocalSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

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

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleSyncCatalog = async () => {
    if (!isOnline) {
      toast.error('Network connection required to refresh local catalog cache.');
      return;
    }

    setIsCatalogSyncing(true);
    try {
      const targetStore = !isAllStores && activeStoreId ? activeStoreId : undefined;
      const res = await posLocalDataService.syncCatalogToLocal(targetStore);
      toast.success(`Local catalog cache updated! (${res.count} products cached)`);
      await loadData();
    } catch {
      toast.error('Failed to sync catalog to local database.');
    } finally {
      setIsCatalogSyncing(false);
    }
  };

  const handleSyncAllSales = async () => {
    if (!isOnline) {
      toast.error('Network connection required to sync offline transactions.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await posLocalDataService.syncPendingSales();
      if (res.successCount > 0) {
        toast.success(`Successfully synced ${res.successCount} offline transaction(s)!`);
      }
      if (res.conflictCount > 0) {
        toast.warning(`${res.conflictCount} sale(s) encountered inventory conflicts during sync.`);
      }
      if (res.errorCount > 0 && res.successCount === 0) {
        toast.error('Could not reach backend API server. Will retry when connection stabilizes.');
      }
      await loadData();
      if (onSyncComplete) onSyncComplete();
    } catch {
      toast.error('Failed to execute offline sales sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (id: number, resolution: 'OVERRIDE_ADJUST' | 'CANCEL') => {
    const success = await posLocalDataService.resolveConflict(id, resolution);
    if (success && resolution === 'OVERRIDE_ADJUST') {
      toast.success('Successfully resolved and synced conflict transaction.');
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
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Database className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>Local-First POS & Offline Queue</span>
                    <StatusBadge variant={isOnline ? 'success' : 'danger'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </StatusBadge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    IndexedDB local catalog cache & opportunistic sync with conflict resolution
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Local Catalog Cache Banner */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Local Catalog Cache: </span>
                <span className="text-muted-foreground">
                  {status ? `${status.cachedProductsCount} medicines cached in IndexedDB` : 'Loading cache...'}
                </span>
                {status?.lastSyncedAt && (
                  <span className="text-micro text-muted-foreground block sm:inline sm:ml-2">
                    (Last synced: {new Date(status.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCatalog}
              disabled={!isOnline || isCatalogSyncing}
              className="h-7 text-xs font-semibold gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={`size-3 ${isCatalogSyncing ? 'animate-spin' : ''}`} />
              <span>{isCatalogSyncing ? 'Updating Cache...' : 'Refresh Catalog Cache'}</span>
            </Button>
          </div>

          {/* Summary Badges */}
          <div className="grid grid-cols-3 gap-2 my-1">
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-2 text-center">
              <span className="block text-xs font-semibold text-warning">Pending Sync</span>
              <span className="text-lg font-bold text-warning">{pendingCount}</span>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-center">
              <span className="block text-xs font-semibold text-destructive">Stock Conflicts</span>
              <span className="text-lg font-bold text-destructive">{conflictCount}</span>
            </div>
            <div className="bg-success/10 border border-success/20 rounded-lg p-2 text-center">
              <span className="block text-xs font-semibold text-success">Synced</span>
              <span className="text-lg font-bold text-success">{syncedCount}</span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 my-1 pr-1 max-h-[380px] divide-y divide-border/60">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading local IndexedDB transaction queue...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="size-8 text-success mx-auto" />
                <p className="font-semibold text-sm text-foreground">Local Transaction Queue Clean</p>
                <p className="text-xs text-muted-foreground">All POS checkouts are fully synchronized with the cloud backend.</p>
              </div>
            ) : (
              records.map((rec) => (
                <div key={rec.id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-foreground">{rec.localReceiptNumber}</span>
                      {rec.clientTxId && (
                        <span className="font-mono text-micro text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          UUID: {rec.clientTxId.slice(0, 8)}...
                        </span>
                      )}
                      <StatusBadge
                        variant={
                          rec.status === 'pending_sync'
                            ? 'warning'
                            : rec.status === 'conflict'
                            ? 'danger'
                            : 'success'
                        }
                        size="xs"
                      >
                        {rec.status === 'pending_sync' ? 'Pending Sync' : rec.status === 'conflict' ? 'Stock Conflict' : 'Synced'}
                      </StatusBadge>
                      <span className="text-xs font-bold text-primary">{rec.totals.grandTotal.toFixed(2)} PKR</span>
                    </div>

                    <p className="text-micro text-muted-foreground">
                      Items: {rec.payload.items.length} | Payment: {rec.payload.paymentMethod} | Date:{' '}
                      {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {rec.errorReason && (
                      <div className="flex items-start gap-1.5 text-micro text-destructive bg-destructive/10 border border-destructive/20 p-1.5 rounded-md mt-1">
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
                          className="h-7 px-2 text-micro gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                          title="Cancel sale and restore local stock"
                        >
                          <XCircle className="size-3" />
                          <span>Cancel & Restore</span>
                        </Button>
                      </div>
                    )}

                    {rec.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRecordToDelete(rec.id!)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
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

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/80 pt-3">
            {syncedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSynced}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
              >
                Clear Synced ({syncedCount})
              </Button>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8.5 text-xs font-semibold"
              >
                Close
              </Button>

              <Button
                size="sm"
                onClick={handleSyncAllSales}
                disabled={!isOnline || isSyncing || pendingCount === 0}
                className="h-8.5 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : `Sync All Pending (${pendingCount})`}</span>
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
