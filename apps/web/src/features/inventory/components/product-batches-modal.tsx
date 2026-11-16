'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Loader2,
  Pill,
  Edit3,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Archive,
  Boxes,
} from 'lucide-react';
import {
  productsApi,
  type BatchData,
} from '../services/products-api';
import { formatCategory, formatDate, getMedicineIconConfig, formatUnitPlural } from './product-list';
import { formatCurrency } from '@/lib/format';
import { EditBatchModal } from './edit-batch-modal';

interface ProductBatchesModalProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId?: string;
}

export function ProductBatchesModal({
  productId,
  open,
  onOpenChange,
  storeId,
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

  // State: Tab, Health Sub-filter, Search, View Mode, Pagination, Inline Edit
  const [stockTab, setStockTab] = useState<'active' | 'depleted'>('active');
  const [activeHealthFilter, setActiveHealthFilter] = useState<'all' | 'healthy' | 'near' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Inline Edit Batch Modal
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<BatchData | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchBatches = () => {
    if (!productId) return;
    setLoading(true);
    productsApi
      .getProductBatches(productId, storeId)
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
      setCurrentPage(1);
      setSearchQuery('');
    }
  }, [open, productId]);

  const iconConfig = productInfo
    ? getMedicineIconConfig(productInfo.category, productInfo.name, productInfo.unit)
    : null;
  const CategoryIcon = iconConfig?.Icon || Pill;

  // Partition Batches: Active (Stock > 0) vs Depleted (Stock = 0)
  const activeBatches = useMemo(
    () => batches.filter((b) => b.quantityRemaining > 0),
    [batches]
  );
  const depletedBatches = useMemo(
    () => batches.filter((b) => b.quantityRemaining <= 0),
    [batches]
  );

  // Active Health Statistics (evaluated exclusively on active stock)
  const expiredActiveCount = useMemo(
    () => activeBatches.filter((b) => b.isExpired).length,
    [activeBatches]
  );
  const nearExpiryActiveCount = useMemo(
    () => activeBatches.filter((b) => b.isNearExpiry).length,
    [activeBatches]
  );
  const healthyActiveCount = useMemo(
    () => activeBatches.filter((b) => !b.isExpired && !b.isNearExpiry).length,
    [activeBatches]
  );

  // Filtered dataset according to Stock Tab + Health Filter + Search Query
  const filteredBatches = useMemo(() => {
    let source = stockTab === 'active' ? activeBatches : depletedBatches;

    if (stockTab === 'active') {
      if (activeHealthFilter === 'healthy') {
        source = source.filter((b) => !b.isExpired && !b.isNearExpiry);
      } else if (activeHealthFilter === 'near') {
        source = source.filter((b) => b.isNearExpiry);
      } else if (activeHealthFilter === 'expired') {
        source = source.filter((b) => b.isExpired);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      source = source.filter((b) => {
        const bnMatch = b.batchNumber?.toLowerCase().includes(q);
        const rackMatch = b.rackNumber?.toLowerCase().includes(q);
        const vendorMatch = b.vendorName?.toLowerCase().includes(q);
        return Boolean(bnMatch || rackMatch || vendorMatch);
      });
    }

    return source;
  }, [stockTab, activeBatches, depletedBatches, activeHealthFilter, searchQuery]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [stockTab, activeHealthFilter, searchQuery]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / pageSize));
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBatches.slice(start, start + pageSize);
  }, [filteredBatches, currentPage, pageSize]);

  const handleOpenEdit = (batch: BatchData) => {
    setSelectedBatchForEdit(batch);
    setEditModalOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-4 sm:p-6 gap-3">
          <DialogHeader className="pb-3 border-b border-border/80 pr-6 sm:pr-8 shrink-0">
            <div className="flex items-start gap-3">
              <div className="size-10 sm:size-11 rounded-xl bg-muted/60 text-muted-foreground/80 flex items-center justify-center shrink-0 border border-border/50">
                <CategoryIcon className="size-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug break-words pr-2">
                    {productInfo ? productInfo.name : 'Medicine Stock Batches'}
                  </DialogTitle>
                  {productInfo && (
                    <Badge variant="secondary" className="text-micro font-medium shrink-0">
                      {formatCategory(productInfo.category)}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  {productInfo && (
                    <>
                      <span>
                        Total Active Stock: <strong className="text-foreground font-semibold">{formatUnitPlural(productInfo.unit, productInfo.totalStock)}</strong>
                      </span>
                      <span className="hidden sm:inline">•</span>
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
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 my-auto">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs font-medium">Loading FEFO stock batches...</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-hidden flex flex-col flex-1">
              {/* Primary Stock Tab Segments: Active Stock vs Depleted History */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60 text-xs w-fit">
                  <button
                    type="button"
                    onClick={() => setStockTab('active')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      stockTab === 'active'
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Boxes className="size-3.5 text-primary shrink-0" />
                    <span>Active Stock ({activeBatches.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockTab('depleted')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      stockTab === 'depleted'
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Archive className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Depleted / Sold Out ({depletedBatches.length})</span>
                  </button>
                </div>

                {/* View Mode & Search Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search batch # or shelf..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-card"
                    />
                  </div>

                  <div className="flex items-center p-0.5 rounded-md border border-border/80 bg-muted/40 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded transition-all cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-card text-primary shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Card View"
                      aria-label="Card View"
                    >
                      <LayoutGrid className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded transition-all cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-card text-primary shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Compact Table View"
                      aria-label="Compact Table View"
                    >
                      <List className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Stock Sub-Filter Chips */}
              {stockTab === 'active' && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveHealthFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                      activeHealthFilter === 'all'
                        ? 'bg-primary/10 text-primary border border-primary/30 font-semibold'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    All Active ({activeBatches.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHealthFilter('healthy')}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeHealthFilter === 'healthy'
                        ? 'bg-success/15 text-success border border-success/30 font-semibold'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-success shrink-0" />
                    <span>Healthy ({healthyActiveCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHealthFilter('near')}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeHealthFilter === 'near'
                        ? 'bg-warning/15 text-warning border border-warning/30 font-semibold'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-warning shrink-0" />
                    <span>Near Expiry ({nearExpiryActiveCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHealthFilter('expired')}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeHealthFilter === 'expired'
                        ? 'bg-destructive/15 text-destructive border border-destructive/30 font-semibold'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                    <span>Expired with Stock ({expiredActiveCount})</span>
                  </button>
                </div>
              )}

              {/* Main Batches Content Area */}
              {filteredBatches.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10 space-y-2 my-auto">
                  <Package className="size-8 mx-auto opacity-40" />
                  <p className="text-xs font-medium">
                    {searchQuery
                      ? `No batches matching "${searchQuery}"`
                      : stockTab === 'depleted'
                      ? 'No depleted batches found for this medicine.'
                      : 'No active stock batches match the selected filter.'}
                  </p>
                  {productId && stockTab === 'active' && activeBatches.length === 0 && (
                    <Button asChild size="sm" variant="outline" className="mt-2 text-xs gap-1.5">
                      <Link href={`/inventory/receive?productId=${productId}`} onClick={() => onOpenChange(false)}>
                        <Plus className="size-3.5" />
                        <span>Receive First Batch</span>
                      </Link>
                    </Button>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* Compact Tabular High-Density View */
                <div className="overflow-y-auto border border-border/80 rounded-lg flex-1">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="py-2 px-3 font-semibold">Batch #</TableHead>
                        <TableHead className="py-2 px-3 font-semibold">Status</TableHead>
                        <TableHead className="py-2 px-3 font-semibold">Expiry Date</TableHead>
                        <TableHead className="py-2 px-3 font-semibold text-right">MRP</TableHead>
                        <TableHead className="py-2 px-3 font-semibold text-right">Cost</TableHead>
                        <TableHead className="py-2 px-3 font-semibold text-right">In Stock</TableHead>
                        <TableHead className="py-2 px-3 font-semibold">Shelf</TableHead>
                        <TableHead className="py-2 px-3 font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBatches.map((batch) => {
                        const isDepleted = batch.quantityRemaining <= 0;
                        return (
                          <TableRow key={batch.id} className="hover:bg-muted/30">
                            <TableCell className="py-2 px-3 font-mono font-bold text-foreground">
                              #{batch.batchNumber}
                            </TableCell>
                            <TableCell className="py-2 px-3">
                              {isDepleted ? (
                                <Badge variant="secondary" className="text-micro font-medium">
                                  Sold Out
                                </Badge>
                              ) : batch.isExpired ? (
                                <Badge variant="destructive" className="text-micro gap-1 font-semibold">
                                  <AlertTriangle className="size-2.5" />
                                  <span>Expired</span>
                                </Badge>
                              ) : batch.isNearExpiry ? (
                                <Badge variant="warning" className="text-micro gap-1 font-semibold">
                                  <Clock className="size-2.5" />
                                  <span>{batch.daysUntilExpiry}d left</span>
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-micro gap-1 font-medium">
                                  <CheckCircle2 className="size-2.5" />
                                  <span>FEFO Active</span>
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                              {formatDate(batch.expiryDate)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-bold text-primary tabular-nums">
                              {formatCurrency(batch.sellPrice)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                              {formatCurrency(batch.costPrice)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-bold text-foreground tabular-nums">
                              {formatUnitPlural(productInfo?.unit || 'Unit', batch.quantityRemaining)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-muted-foreground">
                              {batch.rackNumber || '—'}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(batch)}
                                className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <Edit3 className="size-3" />
                                <span>Edit</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Rich Card Layout (Visual with 3-box grid & progress bar) */
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                  {paginatedBatches.map((batch) => {
                    const isDepleted = batch.quantityRemaining <= 0;
                    const stockPercent =
                      batch.quantityReceived > 0
                        ? Math.min(100, Math.round((batch.quantityRemaining / batch.quantityReceived) * 100))
                        : 0;

                    return (
                      <div
                        key={batch.id}
                        className="p-3 sm:p-3.5 rounded-lg border border-border/80 bg-card hover:border-primary/40 transition-all space-y-2.5 shadow-2xs"
                      >
                        {/* Top Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                            <span className="font-mono font-bold text-xs text-foreground bg-muted px-2 py-0.5 rounded border border-border/80 shrink-0">
                              #{batch.batchNumber}
                            </span>

                            {isDepleted ? (
                              <Badge variant="secondary" className="text-micro font-medium shrink-0">
                                Sold Out / Depleted
                              </Badge>
                            ) : batch.isExpired ? (
                              <Badge variant="destructive" className="text-micro gap-1 font-semibold shrink-0">
                                <AlertTriangle className="size-3" />
                                <span>Expired ({Math.abs(batch.daysUntilExpiry)} days ago)</span>
                              </Badge>
                            ) : batch.isNearExpiry ? (
                              <Badge
                                variant="warning"
                                className="text-micro gap-1 font-semibold shrink-0"
                              >
                                <Clock className="size-3" />
                                <span>Near Expiry ({batch.daysUntilExpiry} days left)</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="success"
                                className="text-micro gap-1 font-medium shrink-0"
                              >
                                <CheckCircle2 className="size-3" />
                                <span>Active FEFO Batch</span>
                              </Badge>
                            )}

                            {batch.rackNumber && (
                              <span className="text-micro text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40 font-medium shrink-0">
                                Shelf: <strong className="text-foreground">{batch.rackNumber}</strong>
                              </span>
                            )}

                            {batch.vendorName && (
                              <span className="text-micro text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40 truncate max-w-[130px] shrink-0">
                                {batch.vendorName}
                              </span>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(batch)}
                            className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                          >
                            <Edit3 className="size-3" />
                            <span>Edit</span>
                          </Button>
                        </div>

                        {/* Structured 3-Box Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/20 p-2.5 rounded-md border border-border/50 text-xs">
                          <div>
                            <span className="text-micro text-muted-foreground uppercase font-medium tracking-wider block">Expiry Date</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {formatDate(batch.expiryDate)}
                            </span>
                          </div>

                          <div>
                            <span className="text-micro text-muted-foreground uppercase font-medium tracking-wider block">Financial Audit</span>
                            <div className="mt-0.5 text-foreground flex items-baseline gap-1 flex-wrap">
                              <span>MRP: <strong className="text-primary font-bold tabular-nums">{formatCurrency(batch.sellPrice)}</strong></span>
                              <span className="text-micro text-muted-foreground tabular-nums">(Cost: {formatCurrency(batch.costPrice)})</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-micro text-muted-foreground font-medium uppercase tracking-wider">
                              <span>Stock Level</span>
                              <span className="font-semibold text-foreground">{stockPercent}%</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isDepleted
                                      ? 'bg-muted-foreground/40'
                                      : batch.isExpired
                                      ? 'bg-destructive'
                                      : batch.isNearExpiry
                                      ? 'bg-warning'
                                      : 'bg-success'
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

              {/* Pagination Controls Bar */}
              {filteredBatches.length > pageSize && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60 shrink-0">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredBatches.length)} of {filteredBatches.length} batches
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="h-7 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Prev</span>
                    </Button>
                    <span className="px-2 font-semibold text-foreground">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="h-7 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              {productId && (
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-border shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 w-full sm:w-auto cursor-pointer"
                  >
                    <Link href={`/inventory/receive?productId=${productId}`} onClick={() => onOpenChange(false)}>
                      <Plus className="size-3.5" />
                      <span className="truncate">Receive New Batch</span>
                    </Link>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} className="text-xs w-full sm:w-auto cursor-pointer">
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline Edit Batch Modal (Opens in-place without routing away) */}
      <EditBatchModal
        batch={selectedBatchForEdit}
        unit={productInfo?.unit || 'Units'}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onBatchUpdated={() => {
          fetchBatches();
        }}
      />
    </>
  );
}
