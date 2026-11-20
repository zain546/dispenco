'use client';

import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  RefreshCw,
  Edit2,
  FileText,
  BadgeAlert,
  CheckCircle2,
  Clock,
  CreditCard,
  ShoppingBag,
  Printer,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatDateTime, getInitials } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  CustomerItem,
} from '../services/customers-api';
import {
  useCustomerDetail,
  useCustomerLedger,
} from '../hooks/use-customers-queries';
import { useStore } from '@/context/store-context';
import { RecordKhataPaymentModal } from './record-khata-payment-modal';

interface CustomerProfileDrawerProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEditCustomer?: (customer: CustomerItem) => void;
  onBalanceUpdated?: () => void;
}

export function CustomerProfileDrawer({
  customerId,
  isOpen,
  onClose,
  onEditCustomer,
  onBalanceUpdated,
}: CustomerProfileDrawerProps) {
  const { activeStore } = useStore();
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales'>('ledger');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const {
    data: customer,
    isLoading: isCustLoading,
    isFetching: isCustFetching,
    isError: isCustError,
    error: custError,
    refetch: refetchCust,
  } = useCustomerDetail(isOpen ? customerId : null);

  const {
    data: ledger,
    isLoading: isLedgerLoading,
    isFetching: isLedgerFetching,
    isError: isLedgerError,
    error: ledgerError,
    refetch: refetchLedger,
  } = useCustomerLedger(isOpen ? customerId : null);

  const isLoading = isCustLoading || isLedgerLoading;
  const isFetching = isCustFetching || isLedgerFetching;

  const handleRefresh = () => {
    void refetchCust();
    void refetchLedger();
  };

  const handlePaymentSuccess = () => {
    handleRefresh();
    onBalanceUpdated?.();
  };

  const escapeHtml = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handlePrintSlip = () => {
    if (!customer || !ledger) return;

    const printWindow = window.open('', '', 'width=420,height=680');
    if (!printWindow) return;

    const storeName = activeStore?.name || 'Pharmacy Counter';
    const storeAddress = activeStore?.address || '';

    const linesHtml = ledger.entries
      .map((entry) => {
        const isDebit = entry.type === 'DEBIT_SALE';
        return `
          <tr>
            <td style="padding: 3px 0; border-bottom: 1px dotted #ccc;">
              <div style="font-weight: 600;">${escapeHtml(formatDate(entry.date))} ${escapeHtml(entry.reference)}</div>
              <div style="font-size: 9px; color: #555;">${escapeHtml(entry.description)}</div>
            </td>
            <td style="padding: 3px 0; text-align: right; border-bottom: 1px dotted #ccc; font-family: monospace;">
              ${isDebit ? `+${entry.debit.toLocaleString()}` : `-${entry.credit.toLocaleString()}`}
            </td>
            <td style="padding: 3px 0; text-align: right; border-bottom: 1px dotted #ccc; font-family: monospace; font-weight: bold;">
              ${entry.balance > 0 ? `+${entry.balance.toLocaleString()}` : `${entry.balance.toLocaleString()}`}
            </td>
          </tr>
        `;
      })
      .join('');

    const isCurrentDebt = ledger.summary.currentBalance > 0;
    const isCurrentAdv = ledger.summary.currentBalance < 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Khata Statement - ${escapeHtml(customer.name)}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body {
              font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
              color: #000;
              margin: 0;
              padding: 6px;
              width: 74mm;
              font-size: 11px;
              line-height: 1.35;
            }
            .center { text-align: center; }
            .header { margin-bottom: 8px; }
            .store-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 9px; text-transform: uppercase; }
            .totals-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
            .balance-box {
              border: 1px solid #000;
              padding: 6px 8px;
              margin: 8px 0;
              text-align: center;
              font-size: 13px;
              font-weight: bold;
            }
            @media print {
              body { width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="center header">
            <div class="store-title">${escapeHtml(storeName)}</div>
            ${storeAddress ? `<div style="font-size:9px;">${escapeHtml(storeAddress)}</div>` : ''}
            <div style="font-weight: bold; margin-top: 4px; font-size: 12px;">CUSTOMER KHATA STATEMENT</div>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Customer:</span><span style="font-weight:bold;">${escapeHtml(customer.name)}</span></div>
          ${customer.phone ? `<div class="row"><span>Phone:</span><span>${escapeHtml(customer.phone)}</span></div>` : ''}
          <div class="row"><span>Date:</span><span>${escapeHtml(formatDateTime(new Date().toISOString()))}</span></div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Date / Details</th>
                <th style="width: 25%; text-align: right;">+/- (PKR)</th>
                <th style="width: 25%; text-align: right;">Bal (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="totals-row">
            <span>Total Debits (Purchases):</span>
            <span style="font-family: monospace;">PKR ${(ledger.summary.totalDebits || 0).toLocaleString()}</span>
          </div>
          <div class="totals-row">
            <span>Total Credits (Payments/Returns):</span>
            <span style="font-family: monospace;">PKR ${(ledger.summary.totalCredits || 0).toLocaleString()}</span>
          </div>
          <div class="double-divider"></div>
          <div class="balance-box">
            ${isCurrentDebt ? `OUTSTANDING DEBT: PKR ${ledger.summary.currentBalance.toLocaleString()}` : isCurrentAdv ? `ADVANCE DEPOSIT: PKR ${Math.abs(ledger.summary.currentBalance).toLocaleString()}` : `ACCOUNT BALANCE: SETTLED (PKR 0)`}
          </div>
          <div class="center" style="font-size: 9px; color: #555; margin-top: 8px;">
            Computer generated statement on ${escapeHtml(formatDate(new Date().toISOString()))}<br/>
            Thank you for your business!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!isOpen) return null;

  const creditBalance = Number(customer?.creditBalance) || 0;
  const isDebt = creditBalance > 0;
  const isAdvance = creditBalance < 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100vw-20px)] sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl sm:rounded-xl border border-border bg-background">
          {/* Header Bar */}
          <DialogHeader className="p-4 sm:px-6 sm:py-4.5 border-b border-border/80 shrink-0 bg-muted/20 pr-11 sm:pr-14">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-full bg-primary/10 text-primary font-bold text-base flex items-center justify-center shrink-0">
                  {customer?.name ? getInitials(customer.name) : <User className="size-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                      {customer?.name || 'Customer Profile'}
                    </DialogTitle>
                    {isCustError ? (
                      <Badge variant="destructive" className="font-medium text-xs">
                        Error Loading Details
                      </Badge>
                    ) : isDebt ? (
                      <Badge variant="destructive" className="tabular-nums font-mono font-semibold text-xs">
                        Debt: {formatCurrency(creditBalance)}
                      </Badge>
                    ) : isAdvance ? (
                      <Badge
                        variant="secondary"
                        className="tabular-nums font-mono font-semibold text-xs bg-success/15 text-success border-success/30"
                      >
                        Advance: {formatCurrency(Math.abs(creditBalance))}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-medium text-xs text-muted-foreground bg-muted/30">
                        Settled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 flex-wrap">
                    {customer?.phone && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Phone className="size-3 text-muted-foreground/80" />
                        <span className="tabular-nums font-mono">{customer.phone}</span>
                      </span>
                    )}
                    {customer?.email && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Mail className="size-3 text-muted-foreground/80" />
                        <span>{customer.email}</span>
                      </span>
                    )}
                    {customer?.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground/80 shrink-0" />
                        <span className="truncate max-w-xs">{customer.address}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto pt-2 sm:pt-0 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoading || isFetching}
                    className="h-8.5 px-2.5 sm:px-3 text-xs gap-1.5 cursor-pointer"
                    title="Refresh statement"
                  >
                    <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrintSlip}
                    disabled={!ledger || ledger.entries.length === 0}
                    className="h-8.5 px-2.5 sm:px-3 text-xs gap-1.5 cursor-pointer"
                    title="Print 80mm thermal Khata slip"
                  >
                    <Printer className="size-3.5 text-primary" />
                    <span className="hidden sm:inline">Print Slip</span>
                  </Button>
                  {customer && onEditCustomer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onEditCustomer(customer);
                        onClose();
                      }}
                      className="h-8.5 px-2.5 sm:px-3 text-xs gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="size-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  className="h-8.5 px-3 sm:px-3.5 text-xs font-bold gap-1.5 cursor-pointer shadow-xs flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground justify-center whitespace-nowrap"
                >
                  <Banknote className="size-4 shrink-0" />
                  <span>Record Payment</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
            {isCustError || isLedgerError ? (
              <div className="p-8 text-center space-y-3 bg-destructive/5 rounded-xl border border-destructive/20 my-4">
                <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <AlertCircle className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Failed to load customer profile or ledger statement
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {getErrorMessage(custError || ledgerError, 'An error occurred while fetching statement data.')}
                </p>
                <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5 text-xs">
                  <RefreshCw className="size-3.5" /> Retry
                </Button>
              </div>
            ) : (isLoading || !customer || !ledger) ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading customer statement & history...</span>
              </div>
            ) : (
              <>
                {/* Financial Summary KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* Khata Balance Card */}
                  <div className={`relative overflow-hidden rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between ${
                    isDebt
                      ? 'border-destructive/25 bg-gradient-to-br from-card via-card to-destructive/[0.06]'
                      : isAdvance
                      ? 'border-success/25 bg-gradient-to-br from-card via-card to-success/[0.06]'
                      : 'border-border/70 bg-gradient-to-br from-card via-card to-muted/20'
                  }`}>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        {isDebt ? 'Khata Debt' : isAdvance ? 'Customer Advance' : 'Khata Balance'}
                      </span>
                      <div className={`size-6 rounded-md flex items-center justify-center shrink-0 ${
                        isDebt
                          ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/20'
                          : isAdvance
                          ? 'bg-success/10 text-success ring-1 ring-success/20'
                          : 'bg-muted text-muted-foreground ring-1 ring-border'
                      }`}>
                        <CreditCard className="size-3" />
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className={`text-lg sm:text-2xl font-bold tracking-tight tabular-nums leading-none ${
                        isDebt ? 'text-destructive' : isAdvance ? 'text-success' : 'text-foreground'
                      }`}>
                        {formatCurrency(Math.abs(creditBalance))}
                      </div>
                      <span className={`inline-block text-micro font-medium ${
                        isDebt ? 'text-destructive' : isAdvance ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {isDebt ? 'Outstanding Debt' : isAdvance ? 'Store Credit on file' : 'Settled Account'}
                      </span>
                    </div>
                  </div>

                  {/* Lifetime Spend */}
                  <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] p-3 sm:p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        Lifetime Spend
                      </span>
                      <div className="size-6 rounded-md bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                        <ShoppingBag className="size-3" />
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                        {formatCurrency(customer?.totalSpent || 0)}
                      </div>
                      <span className="inline-block text-micro text-primary font-medium">
                        All-time Store Spend
                      </span>
                    </div>
                  </div>

                  {/* Total Receipts */}
                  <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-3 sm:p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        Total Purchases
                      </span>
                      <div className="size-6 rounded-md bg-muted text-muted-foreground ring-1 ring-border flex items-center justify-center shrink-0">
                        <Receipt className="size-3" />
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                        {customer?.totalSalesCount || 0}
                      </div>
                      <span className="inline-block text-micro text-muted-foreground font-medium">
                        Completed Orders
                      </span>
                    </div>
                  </div>

                  {/* Repayments */}
                  <div className="relative overflow-hidden rounded-xl border border-success/20 bg-gradient-to-br from-card via-card to-success/[0.04] p-3 sm:p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        Repayments
                      </span>
                      <div className="size-6 rounded-md bg-success/10 text-success ring-1 ring-success/20 flex items-center justify-center shrink-0">
                        <Banknote className="size-3" />
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                        {customer?.totalPaymentsCount || 0}
                      </div>
                      <span className="inline-block text-micro text-success font-medium">
                        {customer?.totalPaymentsCount ? 'Active Payments' : 'No Repayments'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <Tabs
                  value={activeTab}
                  onValueChange={(val) => setActiveTab(val as 'ledger' | 'sales')}
                  className="space-y-4"
                >
                  <TabsList className="h-9 p-1 bg-muted/70 rounded-lg border border-border/60 flex sm:inline-flex items-center gap-1 w-full sm:w-auto">
                    <TabsTrigger
                      value="ledger"
                      className="gap-2 px-3 py-1 text-xs font-medium cursor-pointer flex-1 sm:flex-initial"
                    >
                      <Receipt className="size-3.5 text-primary shrink-0" />
                      <span className="hidden xs:inline">Khata Credit Statement</span>
                      <span className="xs:hidden">Khata Ledger</span>
                      <span className="text-micro font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        {ledger?.entries.length || 0}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="sales"
                      className="gap-2 px-3 py-1 text-xs font-medium cursor-pointer flex-1 sm:flex-initial"
                    >
                      <FileText className="size-3.5 text-primary shrink-0" />
                      <span className="hidden xs:inline">Invoices & Sales</span>
                      <span className="xs:hidden">Sales</span>
                      <span className="text-micro font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        {customer?.recentSales.length || 0}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Khata Ledger Timeline */}
                  <TabsContent value="ledger" className="mt-0 space-y-3">
                    {ledger?.entries.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-xl bg-card/40 space-y-1">
                        <CheckCircle2 className="size-8 text-muted-foreground/50 mx-auto" />
                        <p className="text-xs font-semibold text-foreground pt-1">No Khata Transactions</p>
                        <p className="text-micro text-muted-foreground">
                          This customer has no credit sales or repayments on file.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full min-w-[620px] text-xs text-left">
                            <thead className="bg-muted/40 border-b border-border/60 text-micro text-muted-foreground font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3.5">Date & Time</th>
                                <th className="py-2.5 px-3.5">Reference</th>
                                <th className="py-2.5 px-3.5">Description</th>
                                <th className="py-2.5 px-3.5 text-right">Debit (+)</th>
                                <th className="py-2.5 px-3.5 text-right">Credit (-)</th>
                                <th className="py-2.5 px-3.5 text-right">Running Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {ledger?.entries.map((entry) => {
                                const isDebit = entry.type === 'DEBIT_SALE';

                                return (
                                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-2.5 px-3.5 text-muted-foreground whitespace-nowrap">
                                      {formatDateTime(entry.date)}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-micro font-semibold text-foreground whitespace-nowrap">
                                      {entry.reference}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-foreground/90 max-w-xs truncate">
                                      <div className="flex items-center gap-1.5">
                                        {isDebit ? (
                                          <ArrowUpRight className="size-3.5 text-warning shrink-0" />
                                        ) : (
                                          <ArrowDownLeft className="size-3.5 text-success shrink-0" />
                                        )}
                                        <span className="truncate">{entry.description}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                                      {entry.debit > 0 ? (
                                        <span className="text-warning">
                                          +{entry.debit.toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">—</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                                      {entry.credit > 0 ? (
                                        <span className="text-success">
                                          -{entry.credit.toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">—</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                                      {entry.balance > 0 ? (
                                        <span className="text-destructive font-semibold">
                                          +{formatCurrency(entry.balance)}
                                        </span>
                                      ) : entry.balance < 0 ? (
                                        <span className="text-success font-semibold">
                                          -{formatCurrency(Math.abs(entry.balance))} (Adv)
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">{formatCurrency(0)}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-muted/30 border-t border-border/80 font-bold text-xs">
                              <tr>
                                <td colSpan={3} className="py-2.5 px-3.5 text-foreground">
                                  Ledger Summary Total
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-warning">
                                  +{(ledger?.summary.totalDebits || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-success">
                                  -{(ledger?.summary.totalCredits || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-foreground">
                                  {formatCurrency(ledger?.summary.currentBalance || 0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 2: Invoices & Receipts */}
                  <TabsContent value="sales" className="mt-0 space-y-3">
                    {customer?.recentSales.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-xl bg-card/40 space-y-1">
                        <FileText className="size-8 text-muted-foreground/50 mx-auto" />
                        <p className="text-xs font-semibold text-foreground pt-1">No Purchases Found</p>
                        <p className="text-micro text-muted-foreground">
                          This customer hasn&apos;t completed any store sales yet.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full min-w-[580px] text-xs text-left">
                            <thead className="bg-muted/40 border-b border-border/60 text-micro text-muted-foreground font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3.5">Date</th>
                                <th className="py-2.5 px-3.5">Receipt #</th>
                                <th className="py-2.5 px-3.5">Store Branch</th>
                                <th className="py-2.5 px-3.5">Items</th>
                                <th className="py-2.5 px-3.5">Status</th>
                                <th className="py-2.5 px-3.5 text-right">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {customer?.recentSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-2.5 px-3.5 text-muted-foreground whitespace-nowrap">
                                    {formatDate(sale.createdAt)}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono text-micro font-semibold text-foreground whitespace-nowrap">
                                    {sale.receiptNumber || `SALE-${sale.id.slice(0, 6)}`}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-muted-foreground">
                                    {sale.storeName}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono tabular-nums text-muted-foreground">
                                    {sale.itemsCount} items
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    {sale.status === 'ON_CREDIT' ? (
                                      <Badge variant="warning">
                                        On Credit
                                      </Badge>
                                    ) : sale.status === 'COMPLETED' ? (
                                      <Badge variant="success">
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        {sale.status}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-foreground whitespace-nowrap">
                                    {formatCurrency(sale.totalAmount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Standalone Record Khata Payment Modal */}
      <RecordKhataPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
        customer={
          customer
            ? {
                id: customer.id,
                name: customer.name,
                creditBalance: customer.creditBalance,
              }
            : null
        }
      />
    </>
  );
}
