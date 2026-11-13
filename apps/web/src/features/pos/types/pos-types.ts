import type { ProductData } from '@/features/inventory/services/products-api';

export type PaymentMethod = 'CASH' | 'DIGITAL' | 'CREDIT';
export type UnitType = 'BOX' | 'UNIT';
export type DiscountType = 'FLAT' | 'PERCENT';

export interface CartItem {
  product: ProductData;
  quantity: number;
  unitPrice: number;
  unitType: UnitType;
  discount: number;
  discountType: DiscountType;
  taxRatePercent: number;
}

export interface CartTotals {
  subtotal: number;
  itemDiscounts?: number;
  overallDiscAmount?: number;
  totalDiscount: number;
  taxableAmount?: number;
  taxTotal: number;
  grandTotal: number;
}

export interface ExpiryBadgeInfo {
  isExpired: boolean;
  isNearExpiry: boolean;
  formattedDate: string;
  daysRemaining: number;
}
