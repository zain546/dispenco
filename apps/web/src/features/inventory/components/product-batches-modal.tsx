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
import { formatCategory, formatDate, getMedicineIconConfig } from './product-list';
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

  const expiredCount = batches.filter((b) => b.isExpired).length;
  const nearExpiryCount = batches.filter((b) => b.isNearExpiry).length;
  const healthyCount = batches.filter((b) => !b.isExpired && !b.isNearExpiry).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${iconConfig?.bgClass || 'bg-primary/10 text-primary'}`}
              >
                <CategoryIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {productInfo ? productInfo.name : 'Medicine Stock Batches'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  {productInfo && (
                    <>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatCategory(productInfo.category)}
                      </Badge>
                      <span>•</span>
                      <span>Total Stock: <strong>{productInfo.totalStock} {productInfo.unit}s</strong></span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-xs font-medium">Loading FEFO stock batches...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Batch Status Summary Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-700 dark:text-emerald-300 font-bold text-base">{healthyCount}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Healthy Batches</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-700 dark:text-amber-300 font-bold text-base">{nearExpiryCount}</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">Expiring Soon (&lt;60d)</p>
              </div>
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive font-bold text-base">{expiredCount}</p>
                <p className="text-[11px] text-destructive">Expired Batches</p>
              </div>
            </div>

            {/* FEFO Banner Explanation */}
            <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Clock className="size-4 text-primary shrink-0" />
              <span>
                Batches are listed in <strong>First-Expiring-First-Out (FEFO)</strong> order. Dispatch the top-listed active batch first.
              </span>
            </div>

            {/* Batches Breakdown Table / Cards */}
            {batches.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                <Package className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No stock batches found for this product.</p>
                {productId && (
                  <Button asChild size="sm" variant="outline" className="mt-3 text-xs gap-1.5">
                    <Link href={`/inventory/receive?productId=${productId}`} onClick={() => onOpenChange(false)}>
                      <Plus className="size-3.5" />
                      <span>Receive First Batch</span>
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {batches.map((batch) => {
                  const stockPercent =
                    batch.quantityReceived > 0
                      ? Math.min(100, Math.round((batch.quantityRemaining / batch.quantityReceived) * 100))
                      : 0;

                  return (
                    <div
                      key={batch.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        batch.isExpired
                          ? 'bg-destructive/5 border-destructive/30'
                          : batch.isNearExpiry
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-card border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Left Info: Batch # & Expiry */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                              {batch.batchNumber}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingBatch(batch)}
                              className="size-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Edit Batch Specifications"
                            >
                              <Edit3 className="size-3" />
                            </Button>
                            {batch.isExpired ? (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="size-3" />
                                Expired ({Math.abs(batch.daysUntilExpiry)} days ago)
                              </Badge>
                            ) : batch.isNearExpiry ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1"
                              >
                                <Clock className="size-3" />
                                Near Expiry ({batch.daysUntilExpiry} days remaining)
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1"
                              >
                                <CheckCircle2 className="size-3" />
                                Active Batch
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-muted-foreground/70" />
                              Expiry: <strong>{formatDate(batch.expiryDate)}</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="size-3 text-muted-foreground/70" />
                              MRP: PKR {batch.sellPrice.toFixed(2)} (Cost: PKR {batch.costPrice.toFixed(2)})
                            </span>
                            {batch.vendorName && (
                              <>
                                <span>•</span>
                                <span>Vendor: <strong>{batch.vendorName}</strong></span>
                              </>
                            )}
                            {batch.rackNumber && (
                              <>
                                <span>•</span>
                                <span>Rack: <strong>{batch.rackNumber}</strong></span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Info: Stock Progress Bar */}
                        <div className="sm:text-right shrink-0 space-y-1 min-w-[140px]">
                          <div className="text-xs font-semibold text-foreground">
                            {batch.quantityRemaining} / {batch.quantityReceived} {productInfo?.unit || 'Units'}
                          </div>
                          <div className="w-full sm:w-32 bg-muted h-1.5 rounded-full overflow-hidden">
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Action */}
            {productId && (
              <div className="pt-2 flex items-center justify-between border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs h-8"
                >
                  Close
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="text-xs h-8 gap-1.5"
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
