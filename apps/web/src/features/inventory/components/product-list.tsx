'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Filter,
  Pill,
  Syringe,
  Droplet,
  Stethoscope,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  Boxes,
  Layers,
  AlertTriangle,
  Clock,
  LucideIcon,
  MoreVertical,
  Star,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getProductSeoUrl } from '../utils/seo-utils';
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
import { ProductBatchesModal } from './product-batches-modal';

// ==========================================
// 1. Helper Utilities (SRP & Pure Functions)
// ==========================================

export function formatCategory(catVal: string): string {
  const found = PRODUCT_CATEGORIES.find((c) => c.value === catVal);
  return found ? found.label : catVal;
}

export function formatUnitPlural(unit: string = 'Unit', count?: number): string {
  if (count === 1) return `${count} ${unit}`;

  const cleanUnit = unit.trim();
  let pluralUnit = cleanUnit;

  const lower = cleanUnit.toLowerCase();
  if (lower.endsWith('box')) {
    pluralUnit = cleanUnit.replace(/box$/i, 'Boxes');
  } else if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch') || lower.endsWith('sh')) {
    pluralUnit = `${cleanUnit}es`;
  } else if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) {
    pluralUnit = cleanUnit.slice(0, -1) + 'ies';
  } else if (!lower.endsWith('s')) {
    pluralUnit = `${cleanUnit}s`;
  }

  return count !== undefined ? `${count} ${pluralUnit}` : pluralUnit;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

interface MedicineIconConfig {
  Icon: LucideIcon;
  bgClass: string;
}

export function getMedicineIconConfig(
  category: string,
  name?: string,
  unit?: string,
): MedicineIconConfig {
  const upperCat = (category || '').toUpperCase();
  const upperName = (name || '').toUpperCase();
  const upperUnit = (unit || '').toUpperCase();

  // Injections & IV Infusions or Vials/Ampoules/Pens
  if (
    upperCat.includes('INJECTION') ||
    upperCat.includes('INFUSION') ||
    upperUnit === 'VIAL' ||
    upperUnit === 'AMPOULE' ||
    upperName.includes('INJECTION') ||
    upperName.includes('PEN')
  ) {
    return {
      Icon: Syringe,
      bgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20',
    };
  }

  // Syrups & Liquids or Drops & Bottles
  if (
    upperCat.includes('SYRUP') ||
    upperCat.includes('LIQUID') ||
    upperUnit === 'BOTTLE' ||
    upperName.includes('SYRUP') ||
    upperName.includes('DROPS') ||
    upperName.includes('SUSPENSION') ||
    upperName.includes('ELIXIR')
  ) {
    return {
      Icon: Droplet,
      bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20',
    };
  }

  // Medical Devices & Equipment / Monitors
  if (
    upperCat.includes('DEVICE') ||
    upperCat.includes('EQUIPMENT') ||
    upperName.includes('MONITOR') ||
    upperName.includes('THERMOMETER') ||
    upperName.includes('BP') ||
    upperName.includes('PULSE')
  ) {
    return {
      Icon: Stethoscope,
      bgClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20',
    };
  }

  // General OTC / Protection / Mask / Supplies
  if (
    upperCat.includes('GENERAL') ||
    upperCat.includes('COSMETICS') ||
    upperName.includes('MASK') ||
    upperName.includes('BANDAGE') ||
    upperName.includes('SUPPLY')
  ) {
    return {
      Icon: Package,
      bgClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:bg-purple-500/20',
    };
  }

  // Default Tablets / Capsules / Pills
  return {
    Icon: Pill,
    bgClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-500/20',
  };
}

// ==========================================
// 2. Shared Sub-Components (DRY & SRP)
// ==========================================

function ProductStockStatusBadges({
  totalStock,
  lowStockThreshold,
  expiredBatchCount = 0,
  nearExpiryBatchCount = 0,
  onViewBatches,
  product,
}: {
  totalStock: number;
  lowStockThreshold: number;
  expiredBatchCount?: number;
  nearExpiryBatchCount?: number;
  onViewBatches: (product: ProductData) => void;
  product: ProductData;
}) {
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= lowStockThreshold;
  const hasExpiryWarning = expiredBatchCount > 0 || nearExpiryBatchCount > 0;
  const isPriority = Boolean((product.attributes as Record<string, unknown>)?.isPriority);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Priority Top Seller Badge */}
      {isPriority && (
        <Badge
          variant="outline"
          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0 font-bold"
          title="Top Seller Priority Onboarding Item"
        >
          <Star className="size-3 fill-amber-500 text-amber-500" />
          <span>Top Seller</span>
        </Badge>
      )}

      {/* Quantity Warnings (Out of Stock / Low Stock) */}
      {isOutOfStock ? (
        <Badge variant="destructive" className="text-[10px]">
          Out of Stock
        </Badge>
      ) : isLowStock ? (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
        >
          Low Stock
        </Badge>
      ) : !hasExpiryWarning ? (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
        >
          Healthy
        </Badge>
      ) : null}

      {/* Expiry Alerts */}
      {expiredBatchCount > 0 && (
        <Badge
          variant="destructive"
          onClick={() => onViewBatches(product)}
          className="cursor-pointer text-[10px] px-1.5 py-0 gap-1"
          title={`${expiredBatchCount} expired batch(es)`}
        >
          <AlertTriangle className="size-3" />
          <span>{expiredBatchCount} Expired</span>
        </Badge>
      )}

      {nearExpiryBatchCount > 0 && (
        <Badge
          variant="outline"
          onClick={() => onViewBatches(product)}
          className="cursor-pointer bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0 gap-1 font-medium"
          title={`${nearExpiryBatchCount} near-expiry batch(es)`}
        >
          <Clock className="size-3" />
          <span>{nearExpiryBatchCount} Near Expiry</span>
        </Badge>
      )}
    </div>
  );
}

function ProductTableRow({
  product,
  onDelete,
  onViewBatches,
  onTogglePriority,
}: {
  product: ProductData;
  onDelete: (product: ProductData) => void;
  onViewBatches: (product: ProductData) => void;
  onTogglePriority: (product: ProductData) => void;
}) {
  const totalStock = product.totalStock ?? 0;
  const iconConfig = getMedicineIconConfig(product.category, product.name, product.unit);
  const CategoryIcon = iconConfig.Icon;
  const isPriority = Boolean((product.attributes as Record<string, unknown>)?.isPriority);

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Product & Icon */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-muted/60 text-muted-foreground/80 flex items-center justify-center shrink-0 border border-border/40">
            <CategoryIcon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground truncate">{product.name}</span>
              {product.isControlledSubstance && (
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0"
                >
                  Rx Schedule
                </Badge>
              )}
            </div>
            {product.genericName && (
              <p className="text-xs text-muted-foreground truncate">{product.genericName}</p>
            )}
            {product.barcode && (
              <p className="text-[11px] text-muted-foreground/80 font-mono">{product.barcode}</p>
            )}
          </div>
        </div>
      </td>

      {/* Category & Pack */}
      <td className="py-3 px-4">
        <div className="space-y-0.5">
          <Badge variant="secondary" className="text-[10px]">
            {formatCategory(product.category)}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Unit: <strong>{product.unit}</strong>
          </p>
        </div>
      </td>

      {/* Stock Level & Status */}
      <td className="py-3 px-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onViewBatches(product)}
              className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 text-left"
              title="Click to inspect FEFO Batch Breakdown"
            >
              <span className="text-xs font-semibold">{formatUnitPlural(product.unit, totalStock)}</span>
            </button>

            {product.batchCount !== undefined && product.batchCount > 0 && (
              <Badge
                variant="outline"
                onClick={() => onViewBatches(product)}
                className="cursor-pointer hover:bg-primary/10 text-[10px] gap-1 px-1.5 py-0 border-primary/20 text-primary font-medium"
                title={`${product.batchCount} stock batch(es)`}
              >
                <Layers className="size-3" />
                <span>{product.batchCount} {product.batchCount === 1 ? 'Batch' : 'Batches'}</span>
              </Badge>
            )}
          </div>

          <ProductStockStatusBadges
            totalStock={totalStock}
            lowStockThreshold={product.lowStockThreshold}
            expiredBatchCount={product.expiredBatchCount}
            nearExpiryBatchCount={product.nearExpiryBatchCount}
            onViewBatches={onViewBatches}
            product={product}
          />
        </div>
      </td>

      {/* Pricing */}
      <td className="py-3 px-4">
        <div className="text-xs space-y-0.5">
          <div>
            <span className="text-muted-foreground">MRP: </span>
            <strong className="text-foreground">
              {product.latestSellPrice !== null && product.latestSellPrice !== undefined
                ? `PKR ${product.latestSellPrice.toFixed(2)}`
                : 'N/A'}
            </strong>
          </div>
          {product.latestCostPrice !== null && product.latestCostPrice !== undefined && (
            <div className="text-muted-foreground text-[11px]">
              Cost: PKR {product.latestCostPrice.toFixed(2)}
            </div>
          )}
        </div>
      </td>

      {/* Nearest Expiry */}
      <td className="py-3 px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground/70" />
          <span>{formatDate(product.nearestExpiryDate)}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onTogglePriority(product)}
            className={`size-8 ${isPriority ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground/60 hover:text-amber-500'}`}
            title={isPriority ? 'Remove Top Seller Priority' : 'Mark as Top Seller Priority'}
          >
            <Star className={`size-4 ${isPriority ? 'fill-amber-500' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewBatches(product)}
            className="size-8 text-muted-foreground hover:text-primary"
            title="Inspect FEFO Batches"
          >
            <Layers className="size-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-8 text-primary hover:bg-primary/10">
            <Link href={`/inventory/receive?productId=${product.id}`} title="Receive Stock Batch">
              <Boxes className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground">
            <Link href={getProductSeoUrl(product, 'edit')} title="Edit Product">
              <Edit className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(product)}
            className="size-8 text-destructive hover:bg-destructive/10"
            title="Deactivate Product"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProductCardItem({
  product,
  onDelete,
  onViewBatches,
  onTogglePriority,
}: {
  product: ProductData;
  onDelete: (product: ProductData) => void;
  onViewBatches: (product: ProductData) => void;
  onTogglePriority: (product: ProductData) => void;
}) {
  const totalStock = product.totalStock ?? 0;
  const iconConfig = getMedicineIconConfig(product.category, product.name, product.unit);
  const CategoryIcon = iconConfig.Icon;
  const isPriority = Boolean((product.attributes as Record<string, unknown>)?.isPriority);

  return (
    <Card className="shadow-2xs border-border/80 hover:border-primary/40 transition-all bg-card overflow-hidden">
      <CardContent className="p-3.5 space-y-3">
        {/* Header Row: Category Icon, Medicine Name & Subtitle, and Clean Contextual Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="size-8 rounded-lg bg-muted/60 text-muted-foreground/80 flex items-center justify-center shrink-0 border border-border/50 mt-0.5">
              <CategoryIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-foreground leading-snug break-words flex items-center gap-1.5">
                {product.name}
                {isPriority && <Star className="size-3.5 fill-amber-500 text-amber-500 shrink-0" />}
              </h3>
              {product.genericName && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {product.genericName}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 -mr-1"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onTogglePriority(product)} className="gap-2 cursor-pointer">
                <Star className={`size-3.5 ${isPriority ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                <span>{isPriority ? 'Remove Top Seller' : 'Mark as Top Seller'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewBatches(product)} className="gap-2 cursor-pointer">
                <Layers className="size-3.5 text-primary" />
                <span>Inspect FEFO Batches</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link href={`/inventory/receive?productId=${product.id}`}>
                  <Boxes className="size-3.5 text-emerald-600" />
                  <span>Receive Stock Batch</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link href={getProductSeoUrl(product, 'edit')}>
                  <Edit className="size-3.5 text-muted-foreground" />
                  <span>Edit Medicine Details</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                variant="destructive"
                className="gap-2 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Deactivate Product</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant="secondary" className="text-[10px] font-medium">
            {formatCategory(product.category)}
          </Badge>
          {product.isControlledSubstance && (
            <Badge
              variant="outline"
              className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-semibold"
            >
              Rx Schedule
            </Badge>
          )}
          {product.batchCount !== undefined && product.batchCount > 0 && (
            <Badge
              variant="outline"
              onClick={() => onViewBatches(product)}
              className="cursor-pointer hover:bg-primary/10 text-[10px] gap-1 px-2 py-0 border-primary/30 text-primary font-semibold"
              title={`${product.batchCount} stock batch(es)`}
            >
              <Layers className="size-3" />
              <span>{product.batchCount} {product.batchCount === 1 ? 'Batch' : 'Batches'}</span>
            </Badge>
          )}

          <ProductStockStatusBadges
            totalStock={totalStock}
            lowStockThreshold={product.lowStockThreshold}
            expiredBatchCount={product.expiredBatchCount}
            nearExpiryBatchCount={product.nearExpiryBatchCount}
            onViewBatches={onViewBatches}
            product={product}
          />
        </div>

        {/* Financials & Stock Sub-Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
              Stock Level
            </span>
            <span className="font-bold text-foreground text-xs mt-0.5 block">
              {formatUnitPlural(product.unit, totalStock)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
              Retail MRP
            </span>
            <span className="font-bold text-primary text-xs mt-0.5 block">
              {product.latestSellPrice !== null && product.latestSellPrice !== undefined
                ? `PKR ${product.latestSellPrice.toFixed(2)}`
                : 'N/A'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductDeactivationModal({
  isOpen,
  product,
  isDeleting,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  product: ProductData | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate Medicine Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate <strong>{product?.name}</strong>? Deactivating will hide
            it from active POS sales while preserving stock audit records.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
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
  );
}

// ==========================================
// 3. Main Container Component
// ==========================================

interface ProductListProps {
  hideHeader?: boolean;
}

export function ProductList({ hideHeader = false }: ProductListProps = {}) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('ALL');
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

  // Batch Breakdown Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<ProductData | null>(null);

  const handleViewBatches = (product: ProductData) => {
    setSelectedProductForBatches(product);
    setBatchModalOpen(true);
  };

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
        stockStatus: selectedStockStatus !== 'ALL' ? selectedStockStatus : undefined,
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
  }, [page, limit, debouncedSearch, selectedCategory, selectedStockStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTogglePriority = async (product: ProductData) => {
    const currentPriority = Boolean((product.attributes as Record<string, unknown>)?.isPriority);
    const newPriority = !currentPriority;
    try {
      await productsApi.updateProduct(product.id, { isPriority: newPriority });
      toast.success(
        newPriority
          ? `Marked "${product.name}" as Top Seller Priority`
          : `Removed Top Seller Priority from "${product.name}"`
      );
      fetchProducts();
    } catch {
      toast.error('Failed to update priority status');
    }
  };

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Row */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="size-6 text-primary" />
              <span>Inventory Catalog</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage pharmacy products, batches, stock levels, and FEFO expiry tracking.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              disabled={isLoading}
              className="h-9 px-3 gap-1.5"
              title="Refresh inventory list"
            >
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Link href="/inventory/receive">
                <Boxes className="size-4" />
                <span>Receive Stock</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-3 gap-1.5">
              <Link href="/inventory/new">
                <Plus className="size-4" />
                <span>Add New Product</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
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

          {/* Filters (Category & Stock Status) */}
          <div className="w-full sm:w-auto shrink-0 grid grid-cols-2 sm:flex sm:flex-row items-center gap-2">
            <Filter className="size-4 text-muted-foreground shrink-0 hidden sm:inline" />

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-44">
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

            {/* Stock Status Filter */}
            <Select
              value={selectedStockStatus}
              onValueChange={(val) => {
                setSelectedStockStatus(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-44">
                <SelectValue placeholder="All Stock Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stock Statuses</SelectItem>
                <SelectItem value="LOW">⚠️ Low Stock</SelectItem>
                <SelectItem value="OUT">🚫 Out of Stock</SelectItem>
                <SelectItem value="EXPIRED">🔴 Expired Stock</SelectItem>
                <SelectItem value="NEAR_EXPIRY">🕒 Near Expiry</SelectItem>
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
                  {products.map((prod) => (
                    <ProductTableRow
                      key={prod.id}
                      product={prod}
                      onDelete={confirmDelete}
                      onViewBatches={handleViewBatches}
                      onTogglePriority={handleTogglePriority}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List (Visible on < md) */}
          <div className="md:hidden space-y-3">
            {products.map((prod) => (
              <ProductCardItem
                key={prod.id}
                product={prod}
                onDelete={confirmDelete}
                onViewBatches={handleViewBatches}
                onTogglePriority={handleTogglePriority}
              />
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
            <div>
              Showing <strong>{products.length}</strong> of <strong>{meta.total}</strong> products (Page{' '}
              <strong>{page}</strong> of <strong>{meta.totalPages}</strong>)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || isLoading}
                className="h-8 px-2.5 gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                disabled={page >= meta.totalPages || isLoading}
                className="h-8 px-2.5 gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Modal */}
      <ProductDeactivationModal
        isOpen={deleteDialogOpen}
        product={deletingProduct}
        isDeleting={isDeleting}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />

      {/* FEFO Batches Breakdown Modal */}
      <ProductBatchesModal
        productId={selectedProductForBatches?.id || null}
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
      />
    </div>
  );
}
