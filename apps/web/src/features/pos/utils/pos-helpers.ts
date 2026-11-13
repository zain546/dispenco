import type { ProductData } from '@/features/inventory/services/products-api';
import type { CartItem, UnitType, ExpiryBadgeInfo } from '../types/pos-types';

export const getPackSize = (product: ProductData): number => {
  const attrs = (product.attributes || {}) as Record<string, unknown>;
  return Math.max(1, Number(attrs.packSize) || 1);
};

export const getSingleUnitPrice = (product: ProductData): number => {
  const boxPrice = product.latestSellPrice ?? 0;
  const packSize = getPackSize(product);
  return packSize > 0 ? Number((boxPrice / packSize).toFixed(2)) : boxPrice;
};

// Validate that an entered doctor prescriber name has an actual name beyond "Dr.", "Dr", or "Self"
export const isValidDoctorName = (name?: string | null): boolean => {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === 'self') return false;
  const withoutPrefix = trimmed.replace(/^(dr\.?|doctor)\s*/i, '').trim();
  return withoutPrefix.length >= 2;
};

export const getProductExpiryStatus = (dateStr?: string | null): ExpiryBadgeInfo | null => {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  if (isNaN(expiry.getTime())) return null;

  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const isPast = diffTime <= 0;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = expiry.toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
  });

  if (isPast || daysRemaining < 0) {
    return { isExpired: true, isNearExpiry: false, formattedDate, daysRemaining: Math.min(0, daysRemaining) };
  }

  if (daysRemaining <= 30) {
    return { isExpired: false, isNearExpiry: true, formattedDate, daysRemaining };
  }

  return null;
};

// Calculate total single units (tablets) already committed in cart for a product
export const getCommittedUnitsInCart = (
  cartItems: CartItem[],
  productId: string,
  packSize: number,
  excludeIndex: number = -1
): number => {
  return cartItems.reduce((total, item, idx) => {
    if (idx === excludeIndex || item.product.id !== productId) return total;
    const itemUnits = item.unitType === 'UNIT' ? item.quantity : item.quantity * packSize;
    return total + itemUnits;
  }, 0);
};

// Calculate maximum allowed quantity for a given unitType considering what's already in cart across all lines
export const getMaxAllowedQuantity = (
  cartItems: CartItem[],
  product: ProductData,
  unitType: UnitType,
  excludeIndex: number = -1
): { maxAllowed: number; totalAvailableUnits: number; committedUnits: number; remainingUnits: number } => {
  const packSize = getPackSize(product);
  const totalStockBoxes = product.totalStock ?? 0;
  const totalAvailableUnits = totalStockBoxes * packSize;
  const committedUnits = getCommittedUnitsInCart(cartItems, product.id, packSize, excludeIndex);
  const remainingUnits = Math.max(0, totalAvailableUnits - committedUnits);

  const maxAllowed = unitType === 'UNIT' ? remainingUnits : Math.floor(remainingUnits / packSize);

  return { maxAllowed, totalAvailableUnits, committedUnits, remainingUnits };
};

export const getKhataBalanceBadge = (creditBalance: number) => {
  const num = Number(creditBalance) || 0;
  if (num > 0) {
    return {
      label: `Debt: ${num.toLocaleString('en-PK')} PKR`,
      variant: 'destructive' as const,
      className: 'bg-destructive/15 text-destructive border-destructive/30 font-semibold',
    };
  }
  if (num < 0) {
    return {
      label: `Advance: ${Math.abs(num).toLocaleString('en-PK')} PKR`,
      variant: 'secondary' as const,
      className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-semibold',
    };
  }
  return {
    label: 'Settled: 0 PKR',
    variant: 'secondary' as const,
    className: 'bg-muted text-muted-foreground font-medium',
  };
};
