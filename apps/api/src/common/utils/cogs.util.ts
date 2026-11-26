/**
 * Cost of Goods Sold (COGS) calculation utilities for pharmacy dispensing.
 *
 * Handles:
 * 1. Explicit multi-unit pack configurations (`packSize > 1`) with `unitType` ('UNIT' vs 'BOX'/'PACK'),
 *    including legacy pre-unitType sales where `unitType` defaulted to 'PACK' (`stockDeducted === 0`).
 * 2. Verified multi-unit acquisition / legacy-data pack corrections (`packSize <= 1`):
 *    divides `batchCost` only when explicit `acquisitionPackSize > 1` metadata on the batch or
 *    product confirms a multi-unit pack acquisition, preserving full cost for genuine deeply
 *    discounted single-item sales (including sale-price ratios >= 4).
 */

export interface CogsItemInput {
  quantity: number;
  unitType?: string | null;
  stockDeducted?: number | null;
  unitPrice: unknown;
  batch?: {
    costPrice: unknown;
    sellPrice: unknown;
    acquisitionPackSize?: unknown;
  } | null;
  product?: { unit?: string | null; attributes?: unknown } | null;
}

/**
 * Computes the effective acquisition cost for ONE dispensed unit of `item`
 * (per loose unit if dispensed as loose units, or per pack if dispensed as full packs).
 */
export function computeEffectiveUnitCost(item: Omit<CogsItemInput, 'quantity'> & { quantity?: number }): number {
  const batchCost = Number(item.batch?.costPrice ?? 0);
  if (!Number.isFinite(batchCost) || batchCost <= 0) return 0;

  const batchSell = Number(item.batch?.sellPrice ?? 0);
  const unitPrice = Number(item.unitPrice ?? 0);
  const attrs = (item.product?.attributes as Record<string, unknown>) || {};
  const packSize = Math.max(1, Number(attrs.packSize) || 1);
  const unitType = String(item.unitType || '').trim().toUpperCase();
  const stockDeducted = Number(item.stockDeducted ?? 0);
  const qty = Number(item.quantity ?? 0);

  // 1. Product explicitly configured as multi-unit container (packSize > 1)
  if (packSize > 1) {
    if (unitType === 'UNIT') {
      return batchCost / packSize;
    }

    // Post-unitType full-box checkout explicitly deducts 1 box per 1 box quantity
    if (unitType === 'BOX' && qty > 0 && stockDeducted === qty) {
      return batchCost;
    }

    // Legacy sales (`unitType === 'PACK'`, `stockDeducted === 0`) or ambiguous unitType:
    // infer from proximity of sold `unitPrice` to single-unit MRP vs full-pack MRP
    if (batchSell > 0) {
      const singleUnitSellPrice = batchSell / packSize;
      if (Math.abs(unitPrice - singleUnitSellPrice) < Math.abs(unitPrice - batchSell)) {
        return batchCost / packSize;
      }
      return batchCost;
    }

    if (batchCost > unitPrice && batchCost / packSize <= unitPrice) {
      return batchCost / packSize;
    }

    return batchCost;
  }

  // 2. Verified multi-unit acquisition or explicit legacy-data pack correction (`packSize <= 1`):
  // Never infer multi-unit acquisition from sale-price ratio alone, so genuine deeply discounted
  // single items (including ratios >= 4) preserve their full acquisition cost.
  const rawAcquisitionPackSize = Number(
    item.batch?.acquisitionPackSize ?? attrs.acquisitionPackSize ?? 0,
  );
  const verifiedAcquisitionPackSize = Number.isFinite(rawAcquisitionPackSize)
    ? Math.trunc(rawAcquisitionPackSize)
    : 0;

  if (verifiedAcquisitionPackSize > 1) {
    if (unitType === 'UNIT') {
      return batchCost / verifiedAcquisitionPackSize;
    }
    if (batchSell > 0 && unitPrice > 0) {
      const singleUnitSellPrice = batchSell / verifiedAcquisitionPackSize;
      if (Math.abs(unitPrice - singleUnitSellPrice) < Math.abs(unitPrice - batchSell)) {
        return batchCost / verifiedAcquisitionPackSize;
      }
    }
  }

  return batchCost;
}

/**
 * Computes total COGS (rounded to 2 decimal places) for dispensed units.
 * Derives unit cost from the original `item` (`item.quantity` & `item.stockDeducted`),
 * then scales by `netQuantity` (defaults to `item.quantity`).
 */
export function computeSaleItemCost(item: CogsItemInput, netQuantity?: number): number {
  const effectiveQty = Number(netQuantity ?? item.quantity ?? 0);
  if (!Number.isFinite(effectiveQty) || effectiveQty <= 0) return 0;

  const effectiveUnitCost = computeEffectiveUnitCost(item);
  if (effectiveUnitCost <= 0) return 0;

  return Number((effectiveUnitCost * effectiveQty).toFixed(2));
}
