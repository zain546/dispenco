'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
  Plus,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ChevronRight,
  Eye,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useStore } from '@/context/store-context';
import {
  StockTransfer,
  transfersApi,
  TransferStatus,
} from '../services/transfers-api';
import { RequestTransferModal } from './request-transfer-modal';
import { DispatchTransferModal } from './dispatch-transfer-modal';
import { ReceiveTransferModal } from './receive-transfer-modal';
import { TransferDetailDrawer } from './transfer-detail-drawer';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

type TransferFilterTab =
  | 'all'
  | 'incoming'
  | 'outgoing'
  | 'requested'
  | 'dispatched'
  | 'received';

export function TransfersManager() {
  const { activeStoreId, activeStore, isAllStores, stores } = useStore();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TransferFilterTab>('all');

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Cancel state
  const [transferToCancel, setTransferToCancel] = useState<StockTransfer | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await transfersApi.getTransfers({
        storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
      });
      if (res.success) {
        setTransfers(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load stock transfers', {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, isAllStores]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleOpenDispatch = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setDispatchModalOpen(true);
  };

  const handleOpenReceive = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setReceiveModalOpen(true);
  };

  const handleOpenDetail = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setDetailDrawerOpen(true);
  };

  const handleCancelTransfer = async () => {
    if (!transferToCancel) return;
    try {
      setCancelling(true);
      const res = await transfersApi.cancelTransfer(
        transferToCancel.id,
        'Cancelled by user request'
      );
      toast.success(res.message || 'Transfer cancelled successfully');
      setTransferToCancel(null);
      fetchTransfers();
    } catch (err) {
      toast.error('Failed to cancel transfer', {
        description: getErrorMessage(err),
      });
    } finally {
      setCancelling(false);
    }
  };

  // Metrics
  const totalCount = transfers.length;
  const pendingDispatchCount = transfers.filter((t) => t.status === 'REQUESTED').length;
  const inTransitCount = transfers.filter((t) => t.status === 'DISPATCHED').length;
  const completedCount = transfers.filter((t) => t.status === 'RECEIVED').length;

  // Filtered transfers based on tab and search
  const filteredTransfers = transfers.filter((t) => {
    // Tab filter
    if (activeTab === 'incoming' && activeStoreId) {
      if (t.targetStoreId !== activeStoreId) return false;
    } else if (activeTab === 'outgoing' && activeStoreId) {
      if (t.sourceStoreId !== activeStoreId) return false;
    } else if (activeTab === 'requested') {
      if (t.status !== 'REQUESTED') return false;
    } else if (activeTab === 'dispatched') {
      if (t.status !== 'DISPATCHED') return false;
    } else if (activeTab === 'received') {
      if (t.status !== 'RECEIVED') return false;
    }

    // Search filter
    const q = search.toLowerCase().trim();
    if (!q) return true;

    return (
      t.transferNumber.toLowerCase().includes(q) ||
      t.sourceStore.name.toLowerCase().includes(q) ||
      t.targetStore.name.toLowerCase().includes(q) ||
      t.items.some((item) =>
        item.product.name.toLowerCase().includes(q) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(q))
      )
    );
  });

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <Badge variant="success" className="text-micro gap-1 px-1.5 py-0 font-medium">
            <CheckCircle2 className="size-2.5" /> Received
          </Badge>
        );
      case 'DISPATCHED':
        return (
          <Badge variant="warning" className="text-micro gap-1 px-1.5 py-0 font-medium">
            <Truck className="size-2.5" /> In-Transit
          </Badge>
        );
      case 'REQUESTED':
        return (
          <Badge variant="secondary" className="text-micro gap-1 px-1.5 py-0 font-medium">
            <Clock className="size-2.5" /> Requested
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="text-micro gap-1 px-1.5 py-0 font-medium">
            <XCircle className="size-2.5" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeader
        title="Inter-Branch Stock Transfers"
        description="Request, dispatch, and track inventory movements seamlessly between pharmacy branch locations."
        badge={
          <Badge variant="outline" className="text-xs font-medium">
            {isAllStores ? 'All Branches' : activeStore?.name || 'Active Store'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransfers}
              disabled={loading}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setRequestModalOpen(true)}
              className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Request Stock Transfer</span>
            </Button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Transfers"
          value={formatNumber(totalCount)}
          caption="Requisitions logged"
          icon={ArrowRightLeft}
          isLoading={loading}
        />
        <StatCard
          label="Awaiting Dispatch"
          value={formatNumber(pendingDispatchCount)}
          caption="Source branch action needed"
          icon={Clock}
          variant={pendingDispatchCount > 0 ? 'warning' : 'default'}
          isLoading={loading}
        />
        <StatCard
          label="In-Transit Shipments"
          value={formatNumber(inTransitCount)}
          caption="Dispatched & awaiting delivery"
          icon={Truck}
          variant="default"
          isLoading={loading}
        />
        <StatCard
          label="Completed Transfers"
          value={formatNumber(completedCount)}
          caption="Safely stocked in destination"
          icon={CheckCircle2}
          variant="success"
          isLoading={loading}
        />
      </div>

      {/* Multi-Store Branch Check Alert */}
      {stores.length < 2 && (
        <Card className="border-warning/40 bg-warning/5 p-4 text-xs">
          <div className="flex items-center gap-2.5 text-warning font-semibold">
            <Building2 className="size-4" />
            <span>Multi-Branch Setup Recommended</span>
          </div>
          <p className="text-muted-foreground mt-1 text-micro">
            Stock transfers require at least two registered pharmacy stores. You can add secondary branch locations in the store switcher in the top navigation header.
          </p>
        </Card>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as TransferFilterTab)}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-8 p-1 bg-muted/60 rounded-lg border border-border/60">
              <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                All Transfers
              </TabsTrigger>
              <TabsTrigger value="requested" className="text-xs px-2.5 py-1">
                Pending ({pendingDispatchCount})
              </TabsTrigger>
              <TabsTrigger value="dispatched" className="text-xs px-2.5 py-1">
                In-Transit ({inTransitCount})
              </TabsTrigger>
              <TabsTrigger value="received" className="text-xs px-2.5 py-1">
                Completed ({completedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transfer # or medicine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Transfers Data Table */}
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="size-5 animate-spin text-primary" />
                <span>Loading inter-branch transfers...</span>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={ArrowRightLeft}
                  title="No Stock Transfers Found"
                  description={
                    search
                      ? 'No transfers matched your search filters.'
                      : 'Request inventory from another branch to balance stock levels across your chain.'
                  }
                  action={
                    !search ? (
                      <Button
                        size="sm"
                        onClick={() => setRequestModalOpen(true)}
                        className="gap-1.5 h-8 text-xs font-medium"
                      >
                        <Plus className="size-3.5" />
                        <span>Create First Transfer</span>
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Transfer Reference</th>
                      <th className="py-3 px-4">Origin & Destination</th>
                      <th className="py-3 px-4">Requested Medicines</th>
                      <th className="py-3 px-4">Lifecycle Status</th>
                      <th className="py-3 px-4">Requester</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTransfers.map((t) => {
                      const isSourceBranch = activeStoreId === t.sourceStoreId;
                      const isTargetBranch = activeStoreId === t.targetStoreId;

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => handleOpenDetail(t)}
                        >
                          {/* Reference Number & Date */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-foreground block font-mono text-xs">
                              {t.transferNumber}
                            </span>
                            <span className="text-micro text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="size-3 text-muted-foreground" />
                              {formatDateTime(t.createdAt)}
                            </span>
                          </td>

                          {/* Pathway */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant={isSourceBranch ? 'secondary' : 'outline'}
                                className="text-micro font-medium"
                              >
                                {t.sourceStore.name}
                              </Badge>
                              <span className="text-muted-foreground text-micro">➔</span>
                              <Badge
                                variant={isTargetBranch ? 'secondary' : 'outline'}
                                className="text-micro font-medium"
                              >
                                {t.targetStore.name}
                              </Badge>
                            </div>
                          </td>

                          {/* Items Preview */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground">
                                {t.items.length} {t.items.length === 1 ? 'Medicine' : 'Medicines'}
                              </span>
                              <p className="text-micro text-muted-foreground truncate max-w-48">
                                {t.items.map((i) => `${i.product.name} (${i.quantityRequested})`).join(', ')}
                              </p>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">{getStatusBadge(t.status)}</td>

                          {/* Requester */}
                          <td className="py-3 px-4 text-muted-foreground">
                            <span className="font-medium text-foreground block">
                              {t.requestedByUser.name}
                            </span>
                            <span className="text-micro text-muted-foreground">
                              {t.requestedByUser.email}
                            </span>
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {t.status === 'REQUESTED' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenDispatch(t)}
                                  className="h-7 text-xs px-2.5 gap-1 font-semibold shadow-2xs"
                                >
                                  <Truck className="size-3" />
                                  <span>Dispatch</span>
                                </Button>
                              )}

                              {t.status === 'DISPATCHED' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenReceive(t)}
                                  className="h-7 text-xs px-2.5 gap-1 font-semibold shadow-2xs"
                                >
                                  <CheckCircle2 className="size-3 text-success" />
                                  <span>Receive</span>
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDetail(t)}
                                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="size-3" />
                              </Button>

                              {t.status !== 'RECEIVED' && t.status !== 'CANCELLED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setTransferToCancel(t)}
                                  className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Cancel transfer"
                                >
                                  <XCircle className="size-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals & Drawers */}
      <RequestTransferModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={fetchTransfers}
      />

      <DispatchTransferModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        onSuccess={fetchTransfers}
        transfer={selectedTransfer}
      />

      <ReceiveTransferModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        onSuccess={fetchTransfers}
        transfer={selectedTransfer}
      />

      <TransferDetailDrawer
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        transfer={selectedTransfer}
        onDispatch={(t) => {
          setDetailDrawerOpen(false);
          handleOpenDispatch(t);
        }}
        onReceive={(t) => {
          setDetailDrawerOpen(false);
          handleOpenReceive(t);
        }}
        onCancel={(t) => {
          setDetailDrawerOpen(false);
          setTransferToCancel(t);
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(transferToCancel)}
        onOpenChange={(open) => !open && setTransferToCancel(null)}
        title="Cancel Stock Transfer"
        description={`Are you sure you want to cancel Transfer #${transferToCancel?.transferNumber}? ${
          transferToCancel?.status === 'DISPATCHED'
            ? 'Because this transfer has already been dispatched, all deducted stock will be automatically restored to the source branch batches.'
            : 'This transfer requisition will be marked as cancelled.'
        }`}
        confirmLabel="Cancel Transfer"
        variant="destructive"
        isLoading={cancelling}
        onConfirm={handleCancelTransfer}
      />
    </div>
  );
}
