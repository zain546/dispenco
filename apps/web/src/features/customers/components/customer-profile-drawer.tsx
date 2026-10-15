'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency, formatDate, formatDateTime, getInitials } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  customersApi,
  CustomerItem,
  CustomerLedgerResponse,
  CustomerDetailResponse,
} from '../services/customers-api';
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
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales'>('ledger');
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const [custData, ledgerData] = await Promise.all([
        customersApi.getCustomer(customerId),
        customersApi.getLedger(customerId),
      ]);
      setCustomer(custData);
      setLedger(ledgerData);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load customer profile and ledger'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchDetails();
    }
  }, [isOpen, customerId, fetchDetails]);

  const handlePaymentSuccess = (newBalance: number) => {
    if (customer) {
      setCustomer({ ...customer, creditBalance: newBalance });
    }
    fetchDetails();
    onBalanceUpdated?.();
  };

  if (!isOpen) return null;

  const creditBalance = Number(customer?.creditBalance) || 0;
  const hasDebt = creditBalance > 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border border-border bg-background">
          {/* Header Bar */}
          <DialogHeader className="p-4 sm:px-6 sm:py-4 border-b border-border/80 shrink-0 bg-muted/20 pr-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-primary/10 text-primary font-bold text-base flex items-center justify-center shrink-0">
                  {customer?.name ? getInitials(customer.name) : <User className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                      {customer?.name || 'Customer Profile'}
                    </DialogTitle>
                    {hasDebt ? (
                      <Badge variant="destructive" className="tabular-nums font-mono font-semibold">
                        {formatCurrency(creditBalance)} Balance
                      </Badge>
                    ) : (
                      <Badge variant="success" className="font-medium">
                        Settled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {customer?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        <span className="tabular-nums font-mono">{customer.phone}</span>
                      </span>
                    )}
                    {customer?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        <span>{customer.email}</span>
                      </span>
                    )}
                    {customer?.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        <span className="truncate max-w-xs">{customer.address}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchDetails}
                  disabled={isLoading}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {customer && onEditCustomer && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onEditCustomer(customer);
                      onClose();
                    }}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Edit</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <Banknote className="size-3.5" />
                  <span>Record Payment</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            {isLoading && !customer ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading customer statement & history...</span>
              </div>
            ) : (
              <>
                {/* Financial Summary KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCard
                    label="Khata Debt"
                    value={formatCurrency(creditBalance)}
                    variant={hasDebt ? 'destructive' : 'default'}
                    icon={CreditCard}
                  />
                  <StatCard
                    label="Lifetime Spend"
                    value={formatCurrency(customer?.totalSpent || 0)}
                    variant="default"
                    icon={ShoppingBag}
                  />
                  <StatCard
                    label="Total Receipts"
                    value={customer?.totalSalesCount || 0}
                    variant="default"
                    icon={Receipt}
                  />
                  <StatCard
                    label="Repayments"
                    value={customer?.totalPaymentsCount || 0}
                    variant="default"
                    icon={Banknote}
                  />
                </div>

                {/* Tabs Navigation */}
                <Tabs
                  value={activeTab}
                  onValueChange={(val) => setActiveTab(val as 'ledger' | 'sales')}
                  className="space-y-4"
                >
                  <TabsList className="h-9 p-1 bg-muted/70 rounded-lg border border-border/60 inline-flex items-center gap-1 w-auto">
                    <TabsTrigger
                      value="ledger"
                      className="gap-2 px-3.5 py-1 text-xs font-medium cursor-pointer"
                    >
                      <Receipt className="size-3.5 text-primary" />
                      <span>Khata Credit Statement</span>
                      <span className="text-micro font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        {ledger?.entries.length || 0}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="sales"
                      className="gap-2 px-3.5 py-1 text-xs font-medium cursor-pointer"
                    >
                      <FileText className="size-3.5 text-primary" />
                      <span>Invoices & Sales</span>
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
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
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
                                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-foreground whitespace-nowrap">
                                      {formatCurrency(entry.balance)}
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
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
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
                                  <td className="py-2.5 px-3.5 font-mono text-micro font-semibold text-foreground">
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
