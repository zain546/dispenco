'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  productsApi,
  type BatchData,
} from '@/features/inventory/services/products-api';
import {
  formatCategory,
  formatDate,
  getMedicineIconConfig,
} from '@/features/inventory/components/product-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
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
import { extractIdFromSlugParam } from '@/features/inventory/utils/seo-utils';
import { EditBatchModal } from '@/features/inventory/components/edit-batch-modal';

export default function ProductBatchesPage() {
  const params = useParams();
  const rawParam = params?.id as string;
  const productId = extractIdFromSlugParam(rawParam);

  const [loading, setLoading] = useState(true);
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
    if (productId) {
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
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [productId]);

  const iconConfig = productInfo
    ? getMedicineIconConfig(productInfo.category, productInfo.name, productInfo.unit)
    : null;
  const CategoryIcon = iconConfig?.Icon || Pill;

  const expiredCount = batches.filter((b) => b.isExpired).length;
  const nearExpiryCount = batches.filter((b) => b.isNearExpiry).length;
  const healthyCount = batches.filter((b) => !b.isExpired && !b.isNearExpiry).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
            >
              <Link href="/inventory" title="Back to Catalog">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Boxes className="size-6 text-primary" />
              <span>FEFO Stock Batches Breakdown</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10">
            View active stock batches ordered by First-Expiring-First-Out (FEFO) rules.
          </p>
        </div>

        {productId && (
          <Button asChild size="sm" className="h-9 px-4 gap-1.5 font-semibold">
            <Link href={`/inventory/receive?productId=${productId}`}>
              <Plus className="size-4" />
              <span>Receive New Batch</span>
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="shadow-xs">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-xs font-medium">Loading FEFO stock batches...</p>
          </CardContent>
        </Card>
      ) : !productInfo ? (
        <Card className="shadow-xs">
          <CardContent className="p-12 text-center text-muted-foreground space-y-3">
            <Package className="size-10 mx-auto opacity-40 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Medicine Product Not Found</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory">Return to Inventory Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Medicine Info Header Card */}
          <Card className="shadow-xs border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${iconConfig?.bgClass}`}
                >
                  <CategoryIcon className="size-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground">{productInfo.name}</h2>
                    <Badge variant="secondary" className="text-[11px]">
                      {formatCategory(productInfo.category)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total Active Stock Across All Batches: <strong>{productInfo.totalStock} {productInfo.unit}s</strong>
                  </p>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{healthyCount}</span>
                  <span className="text-[10px] text-muted-foreground">Active</span>
                </div>
                <div className="px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block">{nearExpiryCount}</span>
                  <span className="text-[10px] text-muted-foreground">Near Expiry</span>
                </div>
                <div className="px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-center">
                  <span className="font-bold text-destructive block">{expiredCount}</span>
                  <span className="text-[10px] text-muted-foreground">Expired</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batches Table List Card */}
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>FEFO Batch Distribution ({batches.length} Batches)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Dispatch items from top to bottom. Items with nearest expiry dates are prioritized.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {batches.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                  <Package className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No stock batches found for this product.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => {
                    const stockPercent =
                      batch.quantityReceived > 0
                        ? Math.min(100, Math.round((batch.quantityRemaining / batch.quantityReceived) * 100))
                        : 0;

                    return (
                      <div
                        key={batch.id}
                        className={`p-4 rounded-xl border transition-colors ${
                          batch.isExpired
                            ? 'bg-destructive/5 border-destructive/30'
                            : batch.isNearExpiry
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-card border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-foreground">
                                {batch.batchNumber}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingBatch(batch)}
                                className="size-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Edit Batch Specifications"
                              >
                                <Edit3 className="size-3.5" />
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

                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3.5 text-muted-foreground/70" />
                                Expiry Date: <strong>{formatDate(batch.expiryDate)}</strong>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="size-3.5 text-muted-foreground/70" />
                                Selling Price: PKR {batch.sellPrice.toFixed(2)} (Cost: PKR {batch.costPrice.toFixed(2)})
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

                          <div className="sm:text-right shrink-0 space-y-1.5 min-w-[160px]">
                            <div className="text-xs font-bold text-foreground">
                              {batch.quantityRemaining} / {batch.quantityReceived} {productInfo.unit}s remaining
                            </div>
                            <div className="w-full sm:w-36 bg-muted h-2 rounded-full overflow-hidden">
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
            </CardContent>
          </Card>
        </div>
      )}

      <EditBatchModal
        batch={editingBatch}
        unit={productInfo?.unit}
        open={!!editingBatch}
        onOpenChange={(isOpen) => !isOpen && setEditingBatch(null)}
        onBatchUpdated={fetchBatches}
      />
    </div>
  );
}
