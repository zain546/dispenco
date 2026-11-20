import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  User,
  UserPlus,
  Phone,
  X,
  Search,
  Loader2,
  Stethoscope,
  Tag,
  CreditCard,
  Receipt,
  BookOpen,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type { CustomerItem } from '@/features/customers/services/customers-api';
import type { CartItem, CartTotals, PaymentMethod, DiscountType } from '../types/pos-types';
import { getKhataBalanceBadge } from '../utils/pos-helpers';

interface PosPaymentSidebarProps {
  cart: CartItem[];
  totals: CartTotals;
  // Customer
  selectedCustomer: CustomerItem | null;
  onSelectCustomer: (cust: CustomerItem | null) => void;
  customerSearchQuery: string;
  onCustomerSearchChange: (q: string) => void;
  customerSearchResults: CustomerItem[];
  isCustomerSearching: boolean;
  isCustomerDropdownOpen: boolean;
  onCustomerDropdownOpenChange: (open: boolean) => void;
  onClearCustomerSearch: () => void;
  customerSearchRef: React.RefObject<HTMLDivElement | null>;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  onOpenAddCustomerModal: () => void;
  // Prescriber
  hasControlledMedicine: boolean;
  isSelfDoctor: boolean;
  onIsSelfDoctorChange: (val: boolean) => void;
  doctorName: string;
  onDoctorNameChange: (val: string) => void;
  doctorInputRef: React.RefObject<HTMLInputElement | null>;
  // Discount
  overallDiscount: number;
  onOverallDiscountChange: (discount: number) => void;
  overallDiscountType: DiscountType;
  onOverallDiscountTypeChange: (type: DiscountType) => void;
  // Payment
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  cashTendered: string;
  onCashTenderedChange: (val: string) => void;
  cashInputRef: React.RefObject<HTMLInputElement | null>;
  tenderedNum: number;
  changeDue: number;
  // Submission
  isSubmitting: boolean;
  onCheckout: () => void;
}

export function PosPaymentSidebar({
  cart,
  totals,
  selectedCustomer,
  onSelectCustomer,
  customerSearchQuery,
  onCustomerSearchChange,
  customerSearchResults,
  isCustomerSearching,
  isCustomerDropdownOpen,
  onCustomerDropdownOpenChange,
  onClearCustomerSearch,
  customerSearchRef,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  onOpenAddCustomerModal,
  hasControlledMedicine,
  isSelfDoctor,
  onIsSelfDoctorChange,
  doctorName,
  onDoctorNameChange,
  doctorInputRef,
  overallDiscount,
  onOverallDiscountChange,
  overallDiscountType,
  onOverallDiscountTypeChange,
  paymentMethod,
  onPaymentMethodChange,
  cashTendered,
  onCashTenderedChange,
  cashInputRef,
  tenderedNum,
  changeDue,
  isSubmitting,
  onCheckout,
}: PosPaymentSidebarProps) {
  const isKhataBlocked = paymentMethod === 'CREDIT' && !selectedCustomer;
  const isBlocked = cart.length === 0 || isSubmitting || isKhataBlocked;

  return (
    <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 self-start">
      <Card id="payment-summary-card" className="shadow-2xs border-border/70 bg-card overflow-hidden scroll-mt-20 flex flex-col lg:max-h-[calc(100vh-2rem)]">
        <CardHeader className="p-3.5 pb-2.5 border-b border-border/70 shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Banknote className="size-4 text-primary shrink-0" />
            <span>Payment Summary</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Select payment method and finalize customer checkout.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3.5 space-y-2.5 lg:overflow-y-auto flex-1 min-h-0 overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Customer Account & Khata Credit Section */}
          <div className="space-y-2" ref={customerSearchRef}>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="size-3.5 text-primary shrink-0" />
                <Label className="text-xs font-medium text-foreground whitespace-nowrap">
                  Customer
                </Label>
                {paymentMethod === 'CREDIT' && !selectedCustomer && (
                  <span className="text-micro font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded whitespace-nowrap">
                    Required
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenAddCustomerModal}
                className="h-6.5 px-2 text-micro gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0 font-medium whitespace-nowrap cursor-pointer rounded-md"
              >
                <UserPlus className="size-3" />
                <span>New</span>
              </Button>
            </div>

            {selectedCustomer ? (
              /* Selected Customer Card */
              <div className="p-2.5 rounded-xl border border-primary/25 bg-primary/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{selectedCustomer.name}</p>
                      {(() => {
                        const badge = getKhataBalanceBadge(selectedCustomer.creditBalance);
                        return (
                          <Badge
                            variant={badge.variant}
                            className={`text-micro py-0 px-1.5 h-4.5 shrink-0 font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    {selectedCustomer.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="size-2.5" />
                        <span className="font-mono">{selectedCustomer.phone}</span>
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSelectCustomer(null);
                    onCustomerNameChange('');
                    onCustomerPhoneChange('');
                  }}
                  className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                  title="Deselect Customer"
                  aria-label="Deselect Customer"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              /* Customer Search & Manual Input */
              <div className="space-y-2 relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search customer by name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      onCustomerSearchChange(e.target.value);
                      if (!e.target.value) {
                        onCustomerDropdownOpenChange(false);
                      }
                    }}
                    onFocus={() => {
                      if (customerSearchResults.length > 0) {
                        onCustomerDropdownOpenChange(true);
                      }
                    }}
                    className="h-8.5 pl-8 pr-8 text-xs bg-background/50 border-border/70 rounded-lg focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
                  {isCustomerSearching && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
                  )}
                  {!isCustomerSearching && customerSearchQuery && (
                    <button
                      type="button"
                      onClick={onClearCustomerSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Clear customer search"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Customer Search Dropdown Results */}
                {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-10 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    <div className="p-1">
                      {customerSearchResults.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            onSelectCustomer(cust);
                            onCustomerNameChange(cust.name);
                            onCustomerPhoneChange(cust.phone || '');
                            onCustomerSearchChange('');
                            onCustomerDropdownOpenChange(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{cust.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{cust.phone || 'No phone'}</p>
                          </div>
                          {(() => {
                            const badge = getKhataBalanceBadge(cust.creditBalance);
                            return (
                              <Badge
                                variant={badge.variant}
                                className={`text-micro py-0 px-1.5 h-4.5 shrink-0 font-medium ${badge.className}`}
                              >
                                {badge.label}
                              </Badge>
                            );
                          })()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Walk-in Customer Fallback Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <Input
                    placeholder="Walk-in name"
                    value={customerName}
                    onChange={(e) => onCustomerNameChange(e.target.value)}
                    className="h-8.5 text-xs bg-muted/20 border-border/60 rounded-lg"
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={customerPhone}
                    onChange={(e) => onCustomerPhoneChange(e.target.value)}
                    className="h-8.5 text-xs bg-muted/20 border-border/60 rounded-lg font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prescribing Doctor / Self OTC Section */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Stethoscope className="size-3.5 text-primary shrink-0" />
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <span>Prescriber</span>
                </Label>
                {hasControlledMedicine && (
                  <span className="text-[10px] font-medium text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.2 rounded whitespace-nowrap">
                    Rx Required
                  </span>
                )}
              </div>
              <div className="inline-flex items-center p-0.5 bg-muted/40 border border-border/60 rounded-md">
                <button
                  type="button"
                  disabled={hasControlledMedicine}
                  onClick={() => {
                    if (!hasControlledMedicine) {
                      onIsSelfDoctorChange(true);
                      onDoctorNameChange('Self');
                    }
                  }}
                  className={`h-5.5 px-2 text-[11px] leading-none rounded-[4px] transition-colors whitespace-nowrap ${
                    hasControlledMedicine
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : isSelfDoctor
                        ? 'bg-primary/15 text-primary font-medium cursor-pointer'
                        : 'text-muted-foreground hover:text-foreground font-normal cursor-pointer'
                  }`}
                  title={hasControlledMedicine ? 'Controlled medicine requires prescribing doctor' : 'Over the counter'}
                >
                  Self (OTC)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onIsSelfDoctorChange(false);
                    if (doctorName === 'Self' || !doctorName) {
                      onDoctorNameChange('Dr. ');
                    }
                  }}
                  className={`h-5.5 px-2 text-[11px] leading-none rounded-[4px] transition-colors cursor-pointer whitespace-nowrap ${
                    !isSelfDoctor
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground font-normal'
                  }`}
                >
                  Doctor
                </button>
              </div>
            </div>

            {!isSelfDoctor && (
              <div className="relative pt-0.5">
                <Input
                  ref={doctorInputRef}
                  placeholder="Enter Dr. Name (e.g. Dr. Asif)"
                  value={doctorName}
                  onChange={(e) => onDoctorNameChange(e.target.value)}
                  className="h-8.5 text-xs pr-12 bg-background/50 border-border/70 rounded-lg"
                />
                {!hasControlledMedicine && (
                  <button
                    type="button"
                    onClick={() => {
                      onIsSelfDoctorChange(true);
                      onDoctorNameChange('Self');
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-micro text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded bg-muted/60 cursor-pointer font-medium"
                  >
                    Self
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Overall Discount Toggle */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-xs gap-1.5">
              <Label className="font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap">
                <Tag className="size-3.5 text-primary shrink-0" />
                <span>Order Discount</span>
              </Label>
              <div className="inline-flex items-center p-0.5 bg-muted/40 border border-border/60 rounded-md">
                <button
                  type="button"
                  onClick={() => onOverallDiscountTypeChange('FLAT')}
                  className={`h-5.5 px-2 text-[11px] leading-none rounded-[4px] transition-colors cursor-pointer whitespace-nowrap ${
                    overallDiscountType === 'FLAT'
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground font-normal'
                  }`}
                >
                  Flat PKR
                </button>
                <button
                  type="button"
                  onClick={() => onOverallDiscountTypeChange('PERCENT')}
                  className={`h-5.5 px-2 text-[11px] leading-none rounded-[4px] transition-colors cursor-pointer whitespace-nowrap ${
                    overallDiscountType === 'PERCENT'
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground font-normal'
                  }`}
                >
                  Percent %
                </button>
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max={overallDiscountType === 'PERCENT' ? 100 : undefined}
                placeholder="0"
                value={overallDiscount || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    onOverallDiscountChange(0);
                    return;
                  }
                  const parsed = parseFloat(val) || 0;
                  const clamped =
                    overallDiscountType === 'PERCENT'
                      ? Math.min(100, Math.max(0, parsed))
                      : Math.max(0, parsed);
                  onOverallDiscountChange(clamped);
                }}
                className="h-8.5 text-xs bg-muted/20 border-border/70 pr-7 font-mono rounded-lg"
              />
              {overallDiscount > 0 && (
                <button
                  type="button"
                  onClick={() => onOverallDiscountChange(0)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Remove discount"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-xs font-medium text-foreground">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'DIGITAL', label: 'Digital', icon: CreditCard },
                {
                  id: 'CREDIT',
                  label:
                    selectedCustomer && Number(selectedCustomer.creditBalance) < 0
                      ? 'Advance'
                      : 'Credit',
                  icon: Receipt,
                },
              ].map((method) => {
                const Icon = method.icon;
                const isActive = paymentMethod === method.id;
                const isCredit = method.id === 'CREDIT';
                const hasAdvance = isCredit && selectedCustomer && Number(selectedCustomer.creditBalance) < 0;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => onPaymentMethodChange(method.id as PaymentMethod)}
                    className={`h-10 rounded-lg border text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      isActive
                        ? hasAdvance
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-semibold shadow-2xs ring-1 ring-emerald-500/20'
                          : isCredit
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-semibold shadow-2xs ring-1 ring-amber-500/20'
                          : 'bg-primary/10 border-primary/40 text-primary font-semibold shadow-2xs ring-1 ring-primary/20'
                        : hasAdvance
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-normal'
                        : 'bg-card border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground font-normal'
                    }`}
                  >
                    <Icon
                      className={`size-3.5 ${
                        isActive
                          ? hasAdvance
                            ? 'text-emerald-500'
                            : isCredit
                            ? 'text-amber-500'
                            : 'text-primary'
                          : hasAdvance
                          ? 'text-emerald-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <span className="whitespace-nowrap">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credit / Khata Validation Notice */}
          {paymentMethod === 'CREDIT' && (
            selectedCustomer ? (
              <div
                className={`p-2.5 rounded-lg border space-y-1.5 text-xs ${
                  Number(selectedCustomer.creditBalance) < 0
                    ? 'border-emerald-500/25 bg-emerald-500/5'
                    : 'border-amber-500/25 bg-amber-500/5'
                }`}
              >
                <div
                  className={`flex items-center justify-between font-medium text-micro ${
                    Number(selectedCustomer.creditBalance) < 0 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5" />
                    <span>
                      {Number(selectedCustomer.creditBalance) < 0
                        ? 'Advance Store Credit'
                        : 'Khata Ledger'}
                    </span>
                  </span>
                  <span className="truncate max-w-[140px] font-semibold">{selectedCustomer.name}</span>
                </div>
                {(() => {
                  const curBal = Number(selectedCustomer.creditBalance) || 0;
                  const newBal = curBal + totals.grandTotal;

                  return (
                    <div className="space-y-1 text-micro text-muted-foreground pt-1 border-t border-border/40">
                      <div className="flex justify-between">
                        <span>{curBal < 0 ? 'Available Advance Credit:' : 'Current Debt:'}</span>
                        <span
                          className={`font-mono font-medium ${
                            curBal < 0 ? 'text-emerald-500' : curBal > 0 ? 'text-destructive' : 'text-foreground'
                          }`}
                        >
                          {Math.abs(curBal).toLocaleString()} PKR
                        </span>
                      </div>
                      <div className="flex justify-between font-medium text-foreground">
                        <span>{newBal < 0 ? 'Remaining Advance:' : 'New Total Debt:'}</span>
                        <span className={`font-mono font-semibold ${newBal < 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {Math.abs(newBal).toLocaleString()} PKR
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-destructive" />
                <span className="text-micro font-medium leading-snug">
                  Select a customer above for Khata credit sale.
                </span>
              </div>
            )
          )}

          {/* Cash Tendered & Change Due Calculator */}
          {paymentMethod === 'CASH' && (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Cash Received:</span>
                <div className="relative">
                  <Input
                    ref={cashInputRef}
                    type="number"
                    placeholder="0.00"
                    value={cashTendered}
                    onChange={(e) => onCashTenderedChange(e.target.value)}
                    className="h-8.5 w-28 text-xs text-right font-semibold font-mono pr-6 bg-background/50 border-border/70 rounded-lg"
                  />
                  {cashTendered && (
                    <button
                      type="button"
                      onClick={() => onCashTenderedChange('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Clear cash"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex items-center gap-1 justify-end pt-1 flex-wrap">
                {[100, 500, 1000, 5000].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onCashTenderedChange(amt.toString())}
                    className="h-7 text-xs px-2.5 font-mono font-medium cursor-pointer rounded-md border-border/70 bg-card hover:bg-muted/50 text-foreground"
                  >
                    {amt}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onCashTenderedChange(Math.ceil(totals.grandTotal).toString())}
                  className="h-7 text-xs px-2.5 font-semibold text-primary cursor-pointer hover:bg-primary/10 bg-primary/5 border-primary/20 rounded-md"
                >
                  Exact
                </Button>
              </div>

              {tenderedNum > 0 && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 font-medium">
                  {tenderedNum < totals.grandTotal ? (
                    <>
                      <span className="text-amber-500 flex items-center gap-1 text-micro">
                        <AlertCircle className="size-3 shrink-0" />
                        <span>Shortage / Remaining:</span>
                      </span>
                      <span className="text-amber-500 font-mono font-semibold">
                        {(totals.grandTotal - tenderedNum).toFixed(2)} PKR
                      </span>
                    </>
                  ) : tenderedNum === totals.grandTotal ? (
                    <>
                      <span className="text-emerald-500 text-micro">Exact Cash Tendered:</span>
                      <span className="text-emerald-500 font-mono font-semibold">0.00 PKR</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground text-micro">Change Due:</span>
                      <span className="text-emerald-500 font-mono text-sm font-semibold tabular-nums">
                        {changeDue.toFixed(2)} PKR
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Pinned Bottom Financial Totals & Primary Action CTA */}
        <div className="p-3.5 pt-2.5 border-t border-border/70 bg-card/95 backdrop-blur-xs shrink-0 space-y-2.5">
          {/* Financial Totals Breakdown */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground text-micro font-normal">
              <span>Subtotal:</span>
              <span className="font-mono text-foreground">{totals.subtotal.toFixed(2)} PKR</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-500 text-micro font-normal">
                <span>Discount:</span>
                <span className="font-mono font-medium">-{totals.totalDiscount.toFixed(2)} PKR</span>
              </div>
            )}
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-muted-foreground text-micro font-normal">
                <span>Tax:</span>
                <span className="font-mono text-foreground">+{totals.taxTotal.toFixed(2)} PKR</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border/70 text-foreground">
              <span>Grand Total:</span>
              <span className="text-primary font-mono text-base font-bold tabular-nums">{totals.grandTotal.toFixed(2)} PKR</span>
            </div>
          </div>

          {/* Complete Checkout Action Button */}
          <Button
            type="button"
            onClick={onCheckout}
            disabled={isBlocked}
            className={`w-full h-11 text-sm font-semibold shadow-md gap-2 transition-all active:scale-[0.99] rounded-lg ${
              cart.length === 0
                ? 'cursor-not-allowed bg-muted/80 text-muted-foreground border border-border/80 hover:bg-muted/80'
                : isKhataBlocked
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 cursor-not-allowed hover:bg-amber-500/15'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-[0_0_16px_rgba(20,184,166,0.25)] dark:shadow-[0_0_20px_rgba(45,212,191,0.25)]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Processing Sale...
              </>
            ) : cart.length === 0 ? (
              <>
                <span>Cart is Empty</span>
              </>
            ) : isKhataBlocked ? (
              <>
                <span>Select Customer for Khata</span>
                <ArrowRight className="size-4 opacity-50" />
              </>
            ) : (
              <>
                <span>Complete Sale <span className="hidden md:inline font-mono font-normal opacity-80">(F9)</span></span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

