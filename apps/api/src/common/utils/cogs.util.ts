/**
 * Cost of Goods Sold (COGS) calculation utilities for pharmacy dispensing.
 *
 * Handles:
 * 1. Explicit multi-unit pack configurations (`packSize > 1`) with `unitType` ('UNIT' vs 'BOX'/'PACK'),
 *    including legacy pre-unitType sales where `unitType` defaulted to 'PACK' (`stockDeducted === 0`).
 * 2. Pack-vs-Piece catalog mismatch guardrail: when a product has `packSize <= 1` (e.g. `unit = 'Piece'`)
 *    and a healthy batch margin (`0 < batchCost <= batchSell`), yet a batch's `costPrice` & `sellPrice`
 *    were entered for a full multi-unit box (`N >= 4` tablets/capsules) while POS dispensed single units
 *    at `batchSell / N` (e.g. `sellPrice = 450`, `costPrice = 369`, dispensed at `unitPrice = 15` -> `N = 30`).
 */

export interface CogsItemInput {
  quantity: number;
  unitType?: string | null;
  stockDeducted?: number | null;
  unitPrice: unknown;
  batch?: { costPrice: unknown; sellPrice: unknown } | null;
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

  // 2. Pack-vs-Piece mismatch guardrail (`packSize <= 1`):
  // Protects reports & anomaly scans when a batch's costPrice/sellPrice were entered for a full box
  // (e.g. Box of 30 @ 450 MRP / 369 cost) on a product whose unit was left as 'Piece' (`packSize = 1`),
  // while the counter dispensed single units at `batchSell / N` (e.g. 15 PKR/tablet).
  if (
    batchSell > 0 &&
    batchCost <= batchSell &&
    unitPrice > 0 &&
    unitPrice < batchCost
  ) {
    const impliedPackRatio = batchSell / unitPrice;
    const inferredPackSize = Math.round(impliedPackRatio);
    if (
      inferredPackSize >= 4 &&
      Math.abs(batchSell - unitPrice * inferredPackSize) / batchSell <= 0.03
    ) {
      return batchCost / inferredPackSize;
    }
  }

  return batchCost;
}

/**
 * Computes total COGS (rounded to 2 decimal places) for `item.quantity` dispensed units.
 */
export function computeSaleItemCost(item: CogsItemInput): number {
  const qty = Number(item.quantity ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) return 0;

  const effectiveUnitCost = computeEffectiveUnitCost(item);
  if (effectiveUnitCost <= 0) return 0;

  return Number((effectiveUnitCost * qty).toFixed(2));
}
