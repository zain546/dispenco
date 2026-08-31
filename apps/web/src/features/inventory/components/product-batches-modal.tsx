'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Loader2,
  Boxes,
  DollarSign,
  Pill,
  Edit3,
} from 'lucide-react';
import {
  productsApi,
  type BatchData,
} from '../services/products-api';
import { formatCategory, formatDate, getMedicineIconConfig, formatUnitPlural } from './product-list';
import { EditBatchModal } from './edit-batch-modal';

interface ProductBatchesModalProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductBatchesModal({
  productId,
  open,
  onOpenChange,
}: ProductBatchesModalProps) {
  const [loading, setLoading] = useState(false);
  const [productInfo, setProductInfo] = useState<{
    id: string;
    name: string;
    category: string;
    unit: string;
    totalStock: number;
  } | null>(null);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [editingBatch, setEditingBatch] = useState<BatchData | null>(null);

  const fetchBatches = () => {
    if (!productId) return;
    setLoading(true);
    productsApi
      .getProductBatches(productId)
      .then((res) => {
        setProductInfo(res.product);
        setBatches(res.batches || []);
      })
      .catch(() => {
        setProductInfo(null);
        setBatches([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (open && productId) {
      fetchBatches();
    }
  }, [open, productId]);

  const iconConfig = productInfo
    ? getMedicineIconConfig(productInfo.category, productInfo.name, productInfo.unit)
    : null;
  const CategoryIcon = iconConfig?.Icon || Pill;

  const [filter, setFilter] = useState<'all' | 'healthy' | 'near' | 'expired'>('all');

  const expiredCount = batches.filter((b) => b.isExpired).length;
  const nearExpiryCount = batches.filter((b) => b.isNearExpiry).length;
  const healthyCount = batches.filter((b) => !b.isExpired && !b.isNearExpiry).length;

  const filteredBatches = batches.filter((b) => {
    if (filter === 'healthy') return !b.isExpired && !b.isNearExpiry;
    if (filter === 'near') return b.isNearExpiry;
    if (filter === 'expired') return b.isExpired;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/80">
          <div className="flex items-center gap-3 pr-6">
            <div
              className={`size-11 rounded-xl flex items-center justify-center shrink-0 border border-border/50 ${iconConfig?.bgClass || 'bg-primary/10 text-primary'}`}
            >
              <CategoryIcon className="size-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-foreground truncate">
                  {productInfo ? productInfo.name : 'Medicine Stock Batches'}
                </DialogTitle>
                {productInfo && (
                  <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
                    {formatCategory(productInfo.category)}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                {productInfo && (
                  <>
                    <span>Total Active Stock: <strong className="text-foreground font-semibold">{formatUnitPlural(productInfo.unit, productInfo.totalStock)}</strong></span>
                    <span>•</span>
                    <span className="text-primary font-medium flex items-center gap-1">
                      <Clock className="size-3" /> FEFO Priority Dispatch
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-xs font-medium">Loading FEFO stock batches...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Interactive Minimalist Filter Segment Bar */}
            <div className="flex items-center justify-between gap-2 p-1 bg-muted/40 rounded-lg border border-border/60 text-xs">
              <div className="flex items-center gap-1 overflow-x-auto w-full">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-card text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Batches ({batches.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('healthy')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    filter === 'healthy'
                      ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Healthy ({healthyCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('near')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    filter === 'near'
                      ? 'bg-card text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Near Expiry ({nearExpiryCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('expired')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    filter === 'expired'
                      ? 'bg-card text-destructive shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="size-2 rounded-full bg-destructive shrink-0" />
                  <span>Expired ({expiredCount})</span>
                </button>
              </div>
            </div>

            {/* Batches Breakdown Structured List */}
            {filteredBatches.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10 space-y-2">
                <Package className="size-8 mx-auto opacity-40" />
                <p className="text-xs font-medium">No stock batches match the selected filter.</p>
                {productId && batches.length === 0 && (
                  <Button asChild size="sm" variant="outline" className="mt-2 text-xs gap-1.5">
                    <Link href={`/inventory/receive?productId=${productId}`} onClick={() => onOpenChange(false)}>
                      <Plus className="size-3.5" />
                      <span>Receive First Batch</span>
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredBatches.map((batch) => {
                  const stockPercent =
                    batch.quantityReceived > 0
                      ? Math.min(100, Math.round((batch.quantityRemaining / batch.quantityReceived) * 100))
                      : 0;

                  return (
                    <div
                      key={batch.id}
                      className="p-3.5 rounded-lg border border-border/80 bg-card hover:border-primary/40 transition-all space-y-3 shadow-2xs"
                    >
                      {/* Top Header Row: Batch #, Expiry Badge, Location, and Aligned Edit Action */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground bg-muted px-2.5 py-1 rounded border border-border/80">
                            #{batch.batchNumber}
                          </span>

                          {batch.isExpired ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] gap-1 font-semibold">
                              <AlertTriangle className="size-3" />
                              <span>Expired ({Math.abs(batch.daysUntilExpiry)} days ago)</span>
                            </Badge>
                          ) : batch.isNearExpiry ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-semibold"
                            >
                              <Clock className="size-3" />
                              <span>Near Expiry ({batch.daysUntilExpiry} days left)</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-medium"
                            >
                              <CheckCircle2 className="size-3" />
                              <span>Active FEFO Batch</span>
                            </Badge>
                          )}

                          {batch.rackNumber && (
                            <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40 font-medium">
                              Shelf: <strong className="text-foreground">{batch.rackNumber}</strong>
                            </span>
                          )}

                          {batch.vendorName && (
                            <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40 truncate max-w-[160px]">
                              {batch.vendorName}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingBatch(batch)}
                          className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                        >
                          <Edit3 className="size-3" />
                          <span>Edit</span>
                        </Button>
                      </div>

                      {/* Structured 3-Box Metrics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-muted/20 p-2.5 rounded-md border border-border/50 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block">Expiry Date</span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {formatDate(batch.expiryDate)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block">Financial Audit</span>
                          <div className="mt-0.5 text-foreground">
                            <span>MRP: <strong className="text-primary font-bold">PKR {batch.sellPrice.toFixed(2)}</strong></span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">(Cost: PKR {batch.costPrice.toFixed(2)})</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            <span>Stock Level</span>
                            <span className="font-semibold text-foreground">{stockPercent}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  batch.isExpired
                                    ? 'bg-destructive'
                                    : batch.isNearExpiry
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${stockPercent}%` }}
                              />
                            </div>
                            <span className="font-bold text-foreground text-xs shrink-0">
                              {formatUnitPlural(productInfo?.unit || 'Unit', batch.quantityRemaining)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Action */}
            {productId && (
              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs h-8 px-4"
                >
                  Close
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="text-xs h-8 gap-1.5 px-4"
                  onClick={() => onOpenChange(false)}
                >
                  <Link href={`/inventory/receive?productId=${productId}`}>
                    <Boxes className="size-3.5" />
                    <span>Receive New Shipment Batch</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <EditBatchModal
        batch={editingBatch}
        unit={productInfo?.unit}
        open={!!editingBatch}
        onOpenChange={(isOpen) => !isOpen && setEditingBatch(null)}
        onBatchUpdated={fetchBatches}
      />
    </Dialog>
  );
}
