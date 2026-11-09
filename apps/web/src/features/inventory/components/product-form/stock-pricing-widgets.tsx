import React, { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { Layers, ShieldAlert, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatUnitPlural } from '../product-list';
import type { ProductFormValues } from '../../schemas/product-schema';

export function normalizeUnit(unit?: string | null): string {
  if (!unit) return 'Box';
  const clean = unit.trim().toLowerCase();
  if (clean === 'pack' || clean === 'packs') return 'Box';
  return unit.trim();
}

/**
 * Isolated live calculation ribbon for retail unit conversion and profit margins.
 * Subscribes to only relevant pricing and pack size fields via useWatch so that
 * keystrokes in these inputs do NOT re-render the entire ProductForm tree.
 */
export const PosUnitBreakdown = React.memo(function PosUnitBreakdown({
  control,
}: {
  control: any;
}) {
  const [packSize, costPrice, sellPrice, initialStockQuantity, category, unit, dosageForm] = useWatch({
    control,
    name: [
      'packSize',
      'costPrice',
      'sellPrice',
      'initialStockQuantity',
      'category',
      'unit',
      'dosageForm',
    ],
  });

  const packSizeVal = Math.max(1, Number(packSize) || 1);
  const costPriceVal = Math.max(0, Number(costPrice) || 0);
  const sellPriceVal = Math.max(0, Number(sellPrice) || 0);
  const stockQtyVal = Math.max(0, Number(initialStockQuantity) || 0);
  const selectedUnit = normalizeUnit(unit || 'Box');
  const selectedCategory = category || 'TABLET_CAPSULE';

  const subUnitLabel =
    packSizeVal > 1
      ? selectedCategory === 'TABLET_CAPSULE'
        ? dosageForm?.toLowerCase().includes('cap')
          ? 'Capsule'
          : dosageForm?.toLowerCase().includes('tab')
            ? 'Tablet'
            : selectedUnit.toLowerCase() === 'strip'
              ? 'Tablet'
              : 'Unit'
        : selectedCategory === 'INJECTION_INFUSION' && selectedUnit.toLowerCase() === 'box'
          ? 'Vial'
          : selectedCategory === 'SYRUP_LIQUID' && selectedUnit.toLowerCase() === 'box'
            ? 'Bottle'
            : 'Unit'
      : selectedUnit;

  if (packSizeVal <= 1 && costPriceVal === 0 && sellPriceVal === 0) {
    return null;
  }

  return (
    <div className="col-span-1 sm:col-span-2 rounded-xl border border-success/30 bg-success/5 p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-md bg-success/10 text-success flex items-center justify-center shrink-0">
            <Layers className="size-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight truncate">
            <span className="hidden sm:inline">Retail POS Unit Conversion Breakdown</span>
            <span className="sm:hidden font-bold">POS Unit Breakdown</span>
          </span>
        </div>
        {packSizeVal > 1 && (
          <Badge
            variant="outline"
            className="border-success/30 text-success bg-success/10 text-micro font-bold px-2 py-0.5 shrink-0 whitespace-nowrap"
          >
            {packSizeVal} {formatUnitPlural(subUnitLabel)} / {selectedUnit}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:divide-x divide-border/60 pt-0.5">
        <div className="sm:px-3 first:pl-0 space-y-0.5">
          <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider block">
            Cost / {subUnitLabel}
          </span>
          <p className="text-xs sm:text-sm font-bold text-foreground">
            PKR {packSizeVal > 0 ? (costPriceVal / packSizeVal).toFixed(2) : '0.00'}
          </p>
        </div>

        <div className="sm:px-3 space-y-0.5">
          <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider block">
            Retail / {subUnitLabel}
          </span>
          <p className="text-xs sm:text-sm font-extrabold text-success">
            PKR {packSizeVal > 0 ? (sellPriceVal / packSizeVal).toFixed(2) : '0.00'}
          </p>
        </div>

        <div className="sm:px-3 space-y-0.5">
          <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider block">
            {packSizeVal > 1 ? 'Total Loose Stock' : 'Total Stock'}
          </span>
          <p className="text-xs sm:text-sm font-bold text-foreground">
            {(stockQtyVal * packSizeVal).toLocaleString()}{' '}
            <span className="text-micro font-normal text-muted-foreground">
              {formatUnitPlural(subUnitLabel)}
            </span>
          </p>
        </div>

        <div className="sm:px-3 last:pr-0 space-y-0.5">
          <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider block">
            Est. Gross Margin
          </span>
          <p
            className={`text-xs sm:text-sm font-bold ${
              sellPriceVal > 0 && costPriceVal > sellPriceVal
                ? 'text-destructive font-black'
                : 'text-success'
            }`}
          >
            {sellPriceVal > 0 ? (((sellPriceVal - costPriceVal) / sellPriceVal) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-micro text-muted-foreground leading-tight">
        <Info className="size-3.5 text-success shrink-0" />
        <span>
          {packSizeVal > 1
            ? `Supports full ${selectedUnit} and loose ${formatUnitPlural(subUnitLabel).toLowerCase()} POS sales.`
            : `Supports POS sales in full ${formatUnitPlural(selectedUnit)}.`}
        </span>
      </div>
    </div>
  );
});

/**
 * Isolated expiry date warning banner to prevent expiry date changes from re-rendering the whole form.
 */
export const ExpiryDateNotice = React.memo(function ExpiryDateNotice({
  control,
}: {
  control: any;
}) {
  const expiryDateVal = useWatch({ control, name: 'expiryDate' });

  const expiryWarning = useMemo(() => {
    if (!expiryDateVal || !expiryDateVal.trim()) return null;
    const parts = expiryDateVal.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const expDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return {
        type: 'expired' as const,
        days: Math.abs(days),
        message: `This lot expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`,
      };
    }
    if (days === 0) {
      return {
        type: 'near' as const,
        days: 0,
        message: 'Expires today! Immediate dispensing priority required.',
      };
    }
    if (days <= 30) {
      return {
        type: 'near' as const,
        days,
        message: `Expires in ${days} day${days === 1 ? '' : 's'} (short expiry). Priority FEFO dispensing will apply.`,
      };
    }
    return null;
  }, [expiryDateVal]);

  if (!expiryWarning) return null;

  return expiryWarning.type === 'expired' ? (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-micro text-destructive flex items-center gap-1.5 animate-in fade-in">
      <ShieldAlert className="size-3.5 shrink-0" />
      <span>
        <strong>Expired Lot:</strong> {expiryWarning.message}
      </span>
    </div>
  ) : (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-micro text-amber-700 dark:text-amber-400 flex items-center gap-1.5 animate-in fade-in">
      <AlertCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        <strong>Short Expiry Notice:</strong> {expiryWarning.message}
      </span>
    </div>
  );
});

/**
 * Isolated asterisk indicator for fields required only when initial stock is entered.
 */
export const RequiredStockIndicator = React.memo(function RequiredStockIndicator({
  control,
}: {
  control: any;
}) {
  const stockQty = useWatch({ control, name: 'initialStockQuantity' });
  const hasStock = Number(stockQty) > 0;
  if (!hasStock) return null;
  return (
    <span className="text-destructive font-bold text-xs" title="Required when stock > 0">
      *
    </span>
  );
});
