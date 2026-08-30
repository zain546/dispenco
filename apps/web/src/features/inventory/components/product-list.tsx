'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Filter,
  Pill,
  ShieldAlert,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Boxes,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { productsApi, type ProductData } from '../services/products-api';
import { PRODUCT_CATEGORIES } from '../schemas/product-schema';

export function ProductList() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Deactivation Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productsApi.getProducts({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });

      setProducts(res.data || []);
      setMeta({
        total: res.meta?.total || 0,
        totalPages: res.meta?.totalPages || 1,
        hasNextPage: res.meta?.hasNextPage || false,
        hasPrevPage: res.meta?.hasPrevPage || false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load products';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Deactivation / Soft-Delete
  const confirmDelete = (product: ProductData) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await productsApi.deleteProduct(deletingProduct.id);
      toast.success(`Medicine "${deletingProduct.name}" deactivated.`);
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to deactivate product';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper formatting functions
  const formatCategory = (catVal: string) => {
    const found = PRODUCT_CATEGORIES.find((c) => c.value === catVal);
    return found ? found.label : catVal;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="size-6 text-primary shrink-0" />
            <span>Inventory Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage pharmacy products, batches, stock levels, and FEFO expiry tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts()}
            disabled={isLoading}
            className="size-9 p-0 shrink-0"
            title="Refresh List"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild size="sm" className="w-full sm:w-auto gap-2">
            <Link href="/inventory/new">
              <Plus className="size-4" />
              <span>Add New Product</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar Card */}
      <Card className="shadow-xs bg-card">
        <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine name, generic formula, barcode..."
              className="pl-9 pr-8 h-9 text-xs sm:text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="w-full sm:w-56 shrink-0 flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground shrink-0 hidden sm:inline" />
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs sm:text-sm w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton / Data Table */}
      {isLoading ? (
        <Card className="shadow-xs">
          <CardContent className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-xs sm:text-sm font-medium">Loading pharmacy inventory catalog...</p>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed bg-card/60">
          <CardContent className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Package className="size-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-base font-semibold text-foreground">
                {debouncedSearch || selectedCategory !== 'ALL'
                  ? 'No Products Found'
                  : 'Product Catalog Empty'}
              </p>
              <p className="text-xs text-muted-foreground">
                {debouncedSearch || selectedCategory !== 'ALL'
                  ? 'Try adjusting your search filter or clear the category filter.'
                  : 'Start populating your catalog by adding tablets, syrups, injections, or medical supplies.'}
              </p>
            </div>
            <Button asChild size="sm" className="gap-2 mt-2">
              <Link href="/inventory/new">
                <Plus className="size-4" />
                <span>Add First Product</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Product Table / Cards */
        <div className="space-y-4">
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-lg border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Medicine / Product</th>
                    <th className="py-3 px-4">Category & Unit</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Prices (Cost / MRP)</th>
                    <th className="py-3 px-4">Nearest Expiry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((prod) => {
                    const totalStock = prod.totalStock ?? 0;
                    const isLowStock = totalStock <= prod.lowStockThreshold;
                    const isOutOfStock = totalStock === 0;

                    return (
                      <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                        {/* Medicine Name & Formula */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Pill className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span className="truncate">{prod.name}</span>
                                {prod.isControlledSubstance && (
                                  <Badge
                                    variant="outline"
                                    className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0 font-medium shrink-0"
                                    title="Controlled Substance (Schedule Rx)"
                                  >
                                    Rx
                                  </Badge>
                                )}
                              </div>
                              {prod.genericName && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {prod.genericName}
                                </p>
                              )}
                              {prod.barcode && (
                                <p className="text-[11px] text-muted-foreground/70 font-mono truncate">
                                  {prod.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category & Unit */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <Badge variant="secondary" className="text-[11px] font-medium">
                              {formatCategory(prod.category)}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Unit: <strong>{prod.unit}</strong>
                            </p>
                          </div>
                        </td>

                        {/* Stock Level */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">
                                {totalStock}
                              </span>
                              <span className="text-xs text-muted-foreground">{prod.unit}s</span>
                            </div>
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Out of Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                Healthy
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Prices */}
                        <td className="py-3 px-4">
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium text-foreground">
                              MRP:{' '}
                              {prod.latestSellPrice !== null && prod.latestSellPrice !== undefined
                                ? `PKR ${prod.latestSellPrice.toFixed(2)}`
                                : 'N/A'}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Cost:{' '}
                              {prod.latestCostPrice !== null && prod.latestCostPrice !== undefined
                                ? `PKR ${prod.latestCostPrice.toFixed(2)}`
                                : 'N/A'}
                            </div>
                          </div>
                        </td>

                        {/* Nearest Expiry */}
                        <td className="py-3 px-4">
                          <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="size-3.5 text-primary shrink-0" />
                            <span>{formatDate((prod as any).nearestExpiryDate)}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit Medicine"
                            >
                              <Link href={`/inventory/${prod.id}/edit`}>
                                <Edit className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(prod)}
                              className="size-8 text-destructive hover:bg-destructive/10"
                              title="Deactivate Product"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List (Visible on < md) */}
          <div className="md:hidden space-y-3">
            {products.map((prod) => {
              const totalStock = prod.totalStock ?? 0;
              const isLowStock = totalStock <= prod.lowStockThreshold;
              const isOutOfStock = totalStock === 0;

              return (
                <Card key={prod.id} className="shadow-xs border-border">
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Pill className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-foreground truncate">
                            {prod.name}
                          </h3>
                          {prod.genericName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {prod.genericName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                        >
                          <Link href={`/inventory/${prod.id}/edit`}>
                            <Edit className="size-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(prod)}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {formatCategory(prod.category)}
                      </Badge>
                      {prod.isControlledSubstance && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                          Rx Schedule
                        </Badge>
                      )}
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of Stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Healthy
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Stock Level</span>
                        <span className="font-bold text-foreground">{totalStock} {prod.unit}s</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Retail MRP</span>
                        <span className="font-semibold text-foreground">
                          {prod.latestSellPrice !== null && prod.latestSellPrice !== undefined
                            ? `PKR ${prod.latestSellPrice.toFixed(2)}`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Showing <strong>{products.length}</strong> of <strong>{meta.total}</strong> products
              (Page <strong>{page}</strong> of <strong>{meta.totalPages}</strong>)
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrevPage || isLoading}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage || isLoading}
                className="h-8 gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5 shrink-0" />
              <span>Deactivate Product?</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to deactivate <strong>{deletingProduct?.name}</strong>? Deactivating will hide it from active POS sales while preserving stock audit records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Deactivating...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Deactivate</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
