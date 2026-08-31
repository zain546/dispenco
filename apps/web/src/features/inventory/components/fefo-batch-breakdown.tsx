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
    <Card className="border-border shadow-xs overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              <span>Consolidated FEFO Stock &amp; Batch Breakdown</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stock quantity and expiry dates are managed at individual batch levels (First-Expiring-First-Out).
            </p>
          </div>

          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0 font-medium"
          >
            <Link href={`/inventory/receive?productId=${productId}`}>
              <Plus className="size-3.5" />
              <span>Receive New Batch</span>
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Top FEFO KPI Summary Cards */}
        {batches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Active Stock KPI */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Total Active Stock
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {formatUnitPlural(selectedUnit, stats.totalStock)}
                </p>
              </div>
              <Boxes className="size-5 text-primary/70 shrink-0" />
            </div>

            {/* Nearest Expiry KPI */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Nearest Expiry Date
                </p>
                <p className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                  {stats.nearestExpiryDate ? formatDate(stats.nearestExpiryDate) : 'N/A'}
                </p>
              </div>
              <Calendar className="size-5 text-primary/70 shrink-0" />
            </div>

            {/* Batch Health KPI */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Batches Breakdown
                </p>
                <p className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-2">
                  <span className="text-emerald-600 font-semibold">{stats.healthyCount} Valid</span>
                  {stats.nearExpiryCount > 0 && (
                    <span className="text-amber-600 font-semibold">• {stats.nearExpiryCount} Near</span>
                  )}
                  {stats.expiredCount > 0 && (
                    <span className="text-destructive font-semibold">• {stats.expiredCount} Expired</span>
                  )}
                </p>
              </div>
              <Layers className="size-5 text-primary/70 shrink-0" />
            </div>
          </div>
        )}

        {/* Batches List */}
        {batches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border text-xs space-y-3">
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
            <p className="text-xs font-medium text-muted-foreground">
              Registered Medicine Stock Batches ({batches.length}):
            </p>
            {batches.map((batch) => {
              const expiryInfo = getBatchExpiryDetails(batch.expiryDate);

              return (
                <div
                  key={batch.id}
                  className="bg-card rounded-lg border border-border p-3.5 sm:p-4 space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  {/* Header Row: Batch Number, Expiry Pill, Vendor, Shelf, and Aligned Edit Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono font-bold text-xs text-foreground bg-muted px-2.5 py-1 rounded border border-border/80">
                        #{batch.batchNumber}
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[11px] gap-1 px-2 py-0.5 ${
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
                        <Badge variant="outline" className="text-[11px] text-muted-foreground gap-1 bg-muted/40">
                          <Truck className="size-3 text-muted-foreground" />
                          <span>{batch.vendorName}</span>
                        </Badge>
                      )}

                      {batch.rackNumber && (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground gap-1 bg-muted/40">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span>Shelf: {batch.rackNumber}</span>
                        </Badge>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditBatch(batch)}
                      className="h-8 px-3 text-xs gap-1.5 border-border hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 self-start sm:self-auto"
                    >
                      <Edit3 className="size-3.5" />
                      <span>Edit Batch</span>
                    </Button>
                  </div>

                  {/* Stock and Price details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 bg-muted/30 rounded-md border border-border/40">
                      <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                        Stock Remaining
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-semibold text-foreground text-sm">
                          {formatUnitPlural(selectedUnit, batch.quantityRemaining)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({batch.quantityReceived} rec)
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-muted/30 rounded-md border border-border/40">
                      <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                        Purchase Cost
                      </span>
                      <p className="font-semibold text-foreground text-sm mt-0.5">
                        PKR {Number(batch.costPrice || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-2.5 bg-primary/5 rounded-md border border-primary/20">
                      <span className="text-[10px] text-primary/80 block font-medium uppercase tracking-wider">
                        Retail Price (MRP)
                      </span>
                      <p className="font-bold text-primary text-sm mt-0.5">
                        PKR {Number(batch.sellPrice || 0).toFixed(2)}
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
