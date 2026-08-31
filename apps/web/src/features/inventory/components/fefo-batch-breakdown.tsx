'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Boxes, Calendar, Layers, Plus, Edit3, Truck, MapPin } from 'lucide-react';
import type { BatchData } from '../services/products-api';
import { formatUnitPlural, formatDate } from './product-list';
import { getBatchExpiryDetails, getBatchHealthStats } from '../utils/batch-utils';

interface FefoBatchBreakdownProps {
  productId?: string;
  batches: BatchData[];
  selectedUnit: string;
  onEditBatch: (batch: BatchData) => void;
}

export function FefoBatchBreakdown({
  productId,
  batches,
  selectedUnit,
  onEditBatch,
}: FefoBatchBreakdownProps) {
  const stats = getBatchHealthStats(batches);

  return (
    <Card className="border-border/80 shadow-2xs overflow-hidden bg-card">
      <CardHeader className="bg-muted/30 p-3.5 sm:p-5 border-b border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Boxes className="size-4 text-primary shrink-0" />
              <span>FEFO Stock &amp; Batch Health</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-snug">
              Stock quantity and expiry dates managed per batch (First-Expiring-First-Out).
            </p>
          </div>

          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0 font-semibold self-start sm:self-auto"
          >
            <Link href={`/inventory/receive?productId=${productId}`}>
              <Plus className="size-3.5" />
              <span>Receive New Batch</span>
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 space-y-4">
        {/* Top FEFO KPI Summary Grid */}
        {batches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Total Active Stock KPI */}
            <div className="p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Total Active Stock
                </p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                  {formatUnitPlural(selectedUnit, stats.totalStock)}
                </p>
              </div>
              <Boxes className="size-4 sm:size-5 text-primary/70 shrink-0" />
            </div>

            {/* Nearest Expiry KPI */}
            <div className="p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Nearest Expiry Date
                </p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                  {stats.nearestExpiryDate ? formatDate(stats.nearestExpiryDate) : 'N/A'}
                </p>
              </div>
              <Calendar className="size-4 sm:size-5 text-primary/70 shrink-0" />
            </div>

            {/* Batch Health KPI */}
            <div className="p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Batches Breakdown
                </p>
                <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-emerald-600 dark:text-emerald-400">{stats.healthyCount} Valid</span>
                  {stats.nearExpiryCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">• {stats.nearExpiryCount} Near</span>
                  )}
                  {stats.expiredCount > 0 && (
                    <span className="text-destructive">• {stats.expiredCount} Expired</span>
                  )}
                </p>
              </div>
              <Layers className="size-4 sm:size-5 text-primary/70 shrink-0" />
            </div>
          </div>
        )}

        {/* Batches List */}
        {batches.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border text-xs space-y-3">
            <Boxes className="size-8 text-muted-foreground/50 mx-auto" />
            <div>
              <p className="font-semibold text-foreground">No active stock batches recorded for this medicine.</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Log an incoming shipment batch to set stock quantity and expiry date.
              </p>
            </div>
            <Button asChild size="sm" variant="default" className="h-8 text-xs gap-1.5 mt-2">
              <Link href={`/inventory/receive?productId=${productId}`}>
                <Plus className="size-3.5" />
                <span>Receive First Batch</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                Registered Medicine Stock Batches ({batches.length}):
              </p>
            </div>

            {batches.map((batch) => {
              const expiryInfo = getBatchExpiryDetails(batch.expiryDate);

              return (
                <div
                  key={batch.id}
                  className="bg-card rounded-xl border border-border/80 p-3 sm:p-4 space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  {/* Top Bar: Batch Number & Inline Edit Action */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/80 shrink-0">
                      #{batch.batchNumber}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditBatch(batch)}
                      className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 font-medium"
                    >
                      <Edit3 className="size-3" />
                      <span>Edit Batch</span>
                    </Button>
                  </div>

                  {/* Badges Row: Expiry, Vendor, Shelf */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-[11px] gap-1 px-2 py-0.5 ${
                        expiryInfo.isExpired
                          ? 'bg-destructive/10 text-destructive border-destructive/30 font-semibold'
                          : expiryInfo.isNear
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium'
                      }`}
                    >
                      <Calendar className="size-3" />
                      <span>
                        Exp: {formatDate(batch.expiryDate)} ({expiryInfo.label})
                      </span>
                    </Badge>

                    {batch.vendorName && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 bg-muted/40">
                        <Truck className="size-3 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">{batch.vendorName}</span>
                      </Badge>
                    )}

                    {batch.rackNumber && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 bg-muted/40">
                        <MapPin className="size-3 text-muted-foreground" />
                        <span>Shelf: {batch.rackNumber}</span>
                      </Badge>
                    )}
                  </div>

                  {/* Stock and Price Metrics Sub-Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* Stock Remaining */}
                    <div className="p-2 bg-muted/30 rounded-lg border border-border/40 min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider truncate">
                        Stock
                      </span>
                      <div className="mt-0.5 min-w-0">
                        <p className="font-bold text-foreground text-xs sm:text-sm truncate">
                          {formatUnitPlural(selectedUnit, batch.quantityRemaining)}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                          {batch.quantityReceived} rec
                        </p>
                      </div>
                    </div>

                    {/* Purchase Cost */}
                    <div className="p-2 bg-muted/30 rounded-lg border border-border/40 min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider truncate">
                        Cost
                      </span>
                      <p className="font-bold text-foreground text-xs sm:text-sm mt-0.5 truncate">
                        PKR {Number(batch.costPrice || 0).toFixed(0)}
                      </p>
                    </div>

                    {/* Retail MRP */}
                    <div className="p-2 bg-primary/5 rounded-lg border border-primary/20 min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-primary/80 block font-semibold uppercase tracking-wider truncate">
                        MRP Price
                      </span>
                      <p className="font-bold text-primary text-xs sm:text-sm mt-0.5 truncate">
                        PKR {Number(batch.sellPrice || 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
