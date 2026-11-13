import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Receipt, RotateCcw, ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { DraftQuantityInput } from './draft-quantity-input';
import { DraftPriceInput } from './draft-price-input';
import type { CartItem, UnitType, DiscountType } from '../types/pos-types';
import {
  getPackSize,
  getSingleUnitPrice,
  getMaxAllowedQuantity,
  getProductExpiryStatus,
} from '../utils/pos-helpers';

interface PosCartSectionProps {
  cart: CartItem[];
  onClearCart: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdateUnitPrice: (index: number, price: number) => void;
  onUpdateDiscount: (index: number, discount: number, discountType?: DiscountType) => void;
  onToggleUnitType: (index: number, unitType: UnitType) => void;
  onOpenPackSizeModal: (index: number, productName: string, currentSize: number) => void;
}

export function PosCartSection({
  cart,
  onClearCart,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateDiscount,
  onToggleUnitType,
  onOpenPackSizeModal,
}: PosCartSectionProps) {
  return (
    <Card className="shadow-2xs border-border/80 bg-card overflow-hidden">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border/60">
        <div>
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
            <Receipt className="size-4 text-primary shrink-0" />
            <span>Running Cart ({cart.length} item{cart.length === 1 ? '' : 's'})</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Adjust quantities, apply discounts, or remove items before final receipt checkout.
          </CardDescription>
        </div>

        {cart.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <RotateCcw className="size-3.5 mr-1" /> Clear Cart
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {cart.length === 0 ? (
          /* Empty Cart Placeholder */
          <div className="p-8 sm:p-12 text-center text-muted-foreground space-y-3">
            <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60 border border-border">
              <ShoppingCart className="size-6" />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <p className="text-sm font-semibold text-foreground">Cart is currently empty</p>
              <p className="text-xs text-muted-foreground">
                Use your barcode scanner or the search bar above to add medicines to this transaction.
              </p>
            </div>
          </div>
        ) : (
          /* Active Cart List */
          <div>
            {/* Mobile Touch Cards (Visible on screens < md) */}
            <div className="block md:hidden divide-y divide-border/60">
              {cart.map((item, idx) => {
                const lineSub = item.unitPrice * item.quantity;
                let lineDisc = 0;
                if (item.discount > 0) {
                  lineDisc =
                    item.discountType === 'PERCENT'
                      ? (lineSub * item.discount) / 100
                      : Math.min(lineSub, item.discount);
                }
                const lineTotal = Math.max(0, lineSub - lineDisc);
                const packSize = getPackSize(item.product);
                const singleUnitPrice = getSingleUnitPrice(item.product);
                const availableStockBoxes = item.product.totalStock ?? 0;
                const { maxAllowed: lineMaxStock } = getMaxAllowedQuantity(cart, item.product, item.unitType, idx);

                return (
                  <div key={`${item.product.id}-${item.unitType}`} className="p-3.5 space-y-2.5 bg-card hover:bg-muted/20 transition-colors">
                    {/* Card Header: Product Name, Unit Mode Toggle & Trash Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-foreground leading-snug break-words">
                            {item.product.name}
                          </p>
                          {item.product.isControlledSubstance && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                              Rx
                            </span>
                          )}
                          {(() => {
                            const expiry = getProductExpiryStatus(item.product.nearestExpiryDate);
                            if (!expiry) return null;
                            return (
                              <Badge
                                variant={expiry.isExpired ? 'destructive' : 'outline'}
                                className={`text-[10px] px-1.5 py-0 font-bold shrink-0 ${
                                  expiry.isExpired
                                    ? 'bg-destructive/15 text-destructive border-destructive/30'
                                    : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                }`}
                              >
                                {expiry.isExpired ? `Expired: ${expiry.formattedDate}` : `Exp: ${expiry.formattedDate}`}
                              </Badge>
                            );
                          })()}
                        </div>

                        {/* Minimal Segmented Toggle Control */}
                        <div className="inline-flex items-center p-0.5 rounded-md bg-muted/50 border border-border/30 gap-0.5 mt-0.5">
                          <button
                            type="button"
                            onClick={() => onToggleUnitType(idx, 'BOX')}
                            className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap cursor-pointer ${
                              item.unitType === 'BOX'
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                            }`}
                          >
                            📦 Box
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleUnitType(idx, 'UNIT')}
                            className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap cursor-pointer ${
                              item.unitType === 'UNIT'
                                ? 'bg-success/15 text-success border border-success/30 shadow-2xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                            }`}
                          >
                            💊 Tablet / Unit
                          </button>
                        </div>

                        {/* Subtext info */}
                        <div className="text-micro pt-0.5 truncate">
                          {item.unitType === 'UNIT' ? (
                            <span className="text-success font-medium flex items-center gap-1.5 flex-wrap">
                              <span>{singleUnitPrice.toFixed(2)} PKR/unit • 1/{packSize} Box</span>
                              {packSize === 1 && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPackSizeModal(idx, item.product.name, packSize)}
                                  className="text-micro underline font-bold text-warning hover:underline cursor-pointer"
                                >
                                  ⚙️ Set Pack Size
                                </button>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {packSize} units/box • Stock: {availableStockBoxes}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(idx)}
                        className="size-8 shrink-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 -mr-1 -mt-1 cursor-pointer"
                        title="Remove item"
                        aria-label="Remove item from cart"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {/* Controls Row: Qty, Unit Price, Discount & Line Total */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                      {/* Quantity Controls */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-micro text-muted-foreground font-medium">Qty ({item.unitType === 'UNIT' ? 'Units' : 'Boxes'}):</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                            className="size-8 shrink-0 text-muted-foreground cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </Button>

                          <DraftQuantityInput
                            value={item.quantity}
                            min={1}
                            max={lineMaxStock}
                            onChange={(val) => onUpdateQuantity(idx, val)}
                            className="h-8 w-14 text-xs text-center font-bold px-1"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                            disabled={item.quantity >= lineMaxStock}
                            className="size-8 shrink-0 text-muted-foreground cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="space-y-1 text-right">
                        <span className="text-micro text-muted-foreground font-medium">Unit Price (PKR):</span>
                        <DraftPriceInput
                          value={item.unitPrice}
                          min={0.01}
                          onChange={(val) => onUpdateUnitPrice(idx, val)}
                          className="h-8 text-xs text-right font-semibold ml-auto max-w-[100px]"
                          title="Edit unit price (PKR)"
                        />
                      </div>

                      {/* Discount Input */}
                      <div className="space-y-1">
                        <span className="text-micro text-muted-foreground font-medium">Discount:</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={item.discount || ''}
                            placeholder="0"
                            onChange={(e) => onUpdateDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center font-medium max-w-[70px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onUpdateDiscount(
                                idx,
                                item.discount,
                                item.discountType === 'FLAT' ? 'PERCENT' : 'FLAT',
                              )
                            }
                            className="h-8 text-micro px-1.5 font-bold text-muted-foreground hover:text-primary cursor-pointer"
                          >
                            {item.discountType === 'PERCENT' ? '%' : 'PKR'}
                          </Button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="space-y-1 text-right flex flex-col justify-end">
                        <span className="text-micro text-muted-foreground font-medium">Line Total:</span>
                        <p className="font-extrabold text-sm text-primary">
                          {lineTotal.toFixed(2)} PKR
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Visible on screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-micro font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 pl-4">Item & Unit Type</th>
                    <th className="p-3 w-28 text-center">Unit Price</th>
                    <th className="p-3 w-36 text-center">Quantity</th>
                    <th className="p-3 w-32 text-center">Discount</th>
                    <th className="p-3 pr-4 text-right">Line Total</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {cart.map((item, idx) => {
                    const lineSub = item.unitPrice * item.quantity;
                    let lineDisc = 0;
                    if (item.discount > 0) {
                      lineDisc =
                        item.discountType === 'PERCENT'
                          ? (lineSub * item.discount) / 100
                          : Math.min(lineSub, item.discount);
                    }
                    const lineTotal = Math.max(0, lineSub - lineDisc);
                    const packSize = getPackSize(item.product);
                    const singleUnitPrice = getSingleUnitPrice(item.product);
                    const availableStockBoxes = item.product.totalStock ?? 0;
                    const { maxAllowed: lineMaxStock } = getMaxAllowedQuantity(cart, item.product, item.unitType, idx);

                    return (
                      <tr key={`${item.product.id}-${item.unitType}`} className="hover:bg-muted/30 transition-colors">
                        {/* Medicine Name & Unit Mode Toggle */}
                        <td className="p-3 pl-4 align-middle min-w-[240px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-foreground leading-snug break-words">
                                {item.product.name}
                              </p>
                              {item.product.isControlledSubstance && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                                  Rx Controlled
                                </span>
                              )}
                              {(() => {
                                const expiry = getProductExpiryStatus(item.product.nearestExpiryDate);
                                if (!expiry) return null;
                                return (
                                  <Badge
                                    variant={expiry.isExpired ? 'destructive' : 'outline'}
                                    className={`text-[10px] px-1.5 py-0 font-bold shrink-0 ${
                                      expiry.isExpired
                                        ? 'bg-destructive/15 text-destructive border-destructive/30'
                                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                    }`}
                                  >
                                    {expiry.isExpired ? `Expired: ${expiry.formattedDate}` : `Exp: ${expiry.formattedDate}`}
                                  </Badge>
                                );
                              })()}
                            </div>

                            {/* Minimal Segmented Toggle Control */}
                            <div className="inline-flex items-center p-0.5 rounded-md bg-muted/50 border border-border/30 gap-0.5 mt-0.5">
                              <button
                                type="button"
                                onClick={() => onToggleUnitType(idx, 'BOX')}
                                className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap cursor-pointer ${
                                  item.unitType === 'BOX'
                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                }`}
                              >
                                📦 Box
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleUnitType(idx, 'UNIT')}
                                className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap cursor-pointer ${
                                  item.unitType === 'UNIT'
                                    ? 'bg-success/15 text-success border border-success/30 shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                }`}
                              >
                                💊 Tablet / Unit
                              </button>
                            </div>

                            {/* Subtext info */}
                            <div className="text-micro pt-0.5 truncate">
                              {item.unitType === 'UNIT' ? (
                                <span className="text-success font-medium flex items-center gap-1.5 flex-wrap">
                                  <span>{singleUnitPrice.toFixed(2)} PKR/unit • 1/{packSize} Box</span>
                                  {packSize === 1 && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenPackSizeModal(idx, item.product.name, packSize)}
                                      className="text-micro underline font-bold text-warning hover:underline cursor-pointer"
                                    >
                                      ⚙️ Set Pack Size
                                    </button>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {packSize} units/box • Stock: {availableStockBoxes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="p-3 align-middle text-center">
                          <div className="relative inline-block w-20">
                            <DraftPriceInput
                              value={item.unitPrice}
                              min={0.01}
                              onChange={(val) => onUpdateUnitPrice(idx, val)}
                              className="h-8 text-xs text-center font-semibold focus-visible:ring-1"
                              title="Edit unit price (PKR)"
                            />
                          </div>
                        </td>

                        {/* Quantity Controls */}
                        <td className="p-3 align-middle text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                                className="size-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Minus className="size-3" />
                              </Button>

                              <DraftQuantityInput
                                value={item.quantity}
                                min={1}
                                max={lineMaxStock}
                                onChange={(val) => onUpdateQuantity(idx, val)}
                                className="h-8 w-14 text-xs text-center font-bold px-1 focus-visible:ring-1"
                              />

                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                                disabled={item.quantity >= lineMaxStock}
                                className="size-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                          </div>
                        </td>

                        {/* Per-Item Discount */}
                        <td className="p-3 align-middle text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={item.discount || ''}
                              placeholder="0"
                              onChange={(e) => onUpdateDiscount(idx, parseFloat(e.target.value) || 0)}
                              className="h-8 w-16 text-xs text-center font-medium px-1 focus-visible:ring-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                onUpdateDiscount(
                                  idx,
                                  item.discount,
                                  item.discountType === 'FLAT' ? 'PERCENT' : 'FLAT',
                                )
                              }
                              className="size-7 shrink-0 text-xs font-bold text-muted-foreground hover:text-primary cursor-pointer"
                              title="Toggle Flat ($) vs Percent (%) discount"
                            >
                              {item.discountType === 'PERCENT' ? '%' : 'PKR'}
                            </Button>
                          </div>
                        </td>

                        {/* Line Total */}
                        <td className="p-3 pr-4 align-middle text-right font-bold text-foreground">
                          {lineTotal.toFixed(2)} PKR
                        </td>

                        {/* Remove Item */}
                        <td className="p-3 align-middle text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveItem(idx)}
                            className="size-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Remove item (Delete)"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

