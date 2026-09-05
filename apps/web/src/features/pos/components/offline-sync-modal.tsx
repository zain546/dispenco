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
import { Card, CardContent } from '@/components/ui/card';
import { posOfflineService } from '../services/pos-offline-service';
import { OfflineSaleRecord } from '../db/pos-db';
import { toast } from 'sonner';

interface OfflineSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete?: () => void;
}

export function OfflineSyncModal({ open, onOpenChange, onSyncComplete }: OfflineSyncModalProps) {
  const [records, setRecords] = useState<OfflineSaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await posOfflineService.getAllOfflineSales();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load offline records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadRecords();
    }
  }, [open, loadRecords]);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast.error('Network connection required to sync offline transactions.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await posOfflineService.syncQueuedSales();
      if (res.successCount > 0) {
        toast.success(`Successfully synced ${res.successCount} offline transaction(s)!`);
      }
      if (res.conflictCount > 0) {
        toast.warning(`${res.conflictCount} sale(s) encountered inventory conflicts during sync.`);
      }
      if (res.errorCount > 0 && res.successCount === 0) {
        toast.error('Could not reach backend API server. Will retry when connection stabilizes.');
      }
      await loadRecords();
      if (onSyncComplete) onSyncComplete();
    } catch {
      toast.error('Failed to execute offline sales sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySingle = async (id: number) => {
    if (!isOnline) {
      toast.error('Internet connection required to retry sync.');
      return;
    }
    await posOfflineService.retrySingleSale(id);
    await loadRecords();
    if (onSyncComplete) onSyncComplete();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to remove this offline transaction log?')) {
      await posOfflineService.deleteRecord(id);
      toast.info('Offline transaction record removed');
      await loadRecords();
      if (onSyncComplete) onSyncComplete();
    }
  };

  const handleClearSynced = async () => {
    await posOfflineService.clearSyncedRecords();
    toast.success('Cleaned up synced offline records');
    await loadRecords();
  };

  const pendingCount = records.filter((r) => r.status === 'pending_sync').length;
  const conflictCount = records.filter((r) => r.status === 'conflict').length;
  const syncedCount = records.filter((r) => r.status === 'synced').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Database className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Offline Transaction Queue</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] gap-1 font-semibold ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                    }`}
                  >
                    {isOnline ? <Wifi className="size-3 text-emerald-500" /> : <WifiOff className="size-3 text-rose-500" />}
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  IndexedDB local-first storage & automatic reconciliation for POS checkouts
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Badges */}
        <div className="grid grid-cols-3 gap-2 my-2">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-center">
            <span className="block text-xs font-semibold text-amber-700 dark:text-amber-300">Pending Sync</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{pendingCount}</span>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-center">
            <span className="block text-xs font-semibold text-rose-700 dark:text-rose-300">Stock Conflicts</span>
            <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{conflictCount}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center">
            <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300">Synced</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{syncedCount}</span>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-2 pr-1 max-h-[360px] divide-y divide-border/60">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading local IndexedDB transaction queue...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-sm text-foreground">IndexedDB Queue Empty</p>
              <p className="text-xs text-muted-foreground">All POS transactions are in sync with the server database.</p>
            </div>
          ) : (
            records.map((rec) => (
              <div key={rec.id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-foreground">{rec.localReceiptNumber}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        rec.status === 'pending_sync'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : rec.status === 'conflict'
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      }`}
                    >
                      {rec.status === 'pending_sync' ? 'Pending Sync' : rec.status === 'conflict' ? 'Stock Conflict' : 'Synced'}
                    </Badge>
                    <span className="text-xs font-bold text-primary">{rec.totals.grandTotal.toFixed(2)} PKR</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Items: {rec.payload.items.length} | Payment: {rec.payload.paymentMethod} | Date: {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {rec.errorReason && (
                    <div className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 p-1.5 rounded-md mt-1">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      <span>{rec.errorReason}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0">
                  {rec.status === 'conflict' && rec.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetrySingle(rec.id!)}
                      disabled={!isOnline || isSyncing}
                      className="h-7 px-2 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                    >
                      <RotateCcw className="size-3" />
                      <span>Retry</span>
                    </Button>
                  )}
                  {rec.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rec.id!)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete record"
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
              onClick={handleSyncAll}
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
  );
}
