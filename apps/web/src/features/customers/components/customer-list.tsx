'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Receipt,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency, getInitials } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  customersApi,
  CustomerItem,
  CustomerListResponse,
} from '../services/customers-api';
import { CustomerModal } from './customer-modal';
import { RecordKhataPaymentModal } from './record-khata-payment-modal';
import { CustomerProfileDrawer } from './customer-profile-drawer';

export function CustomerList() {
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasBalanceFilter, setHasBalanceFilter] = useState<'all' | 'debt' | 'settled'>('all');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerItem | null>(null);

  const [selectedCustomerIdForDrawer, setSelectedCustomerIdForDrawer] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [customerForQuickPayment, setCustomerForQuickPayment] = useState<CustomerItem | null>(null);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);

  // Deletion confirm dialog state
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await customersApi.getCustomers({
        search: search.trim() || undefined,
        hasBalance:
          hasBalanceFilter === 'debt'
            ? 'true'
            : hasBalanceFilter === 'settled'
            ? 'false'
            : undefined,
        page,
        limit: 20,
      });
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load customers'));
    } finally {
      setIsLoading(false);
    }
  }, [search, hasBalanceFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleOpenDrawer = (customer: CustomerItem) => {
    setSelectedCustomerIdForDrawer(customer.id);
    setIsDrawerOpen(true);
  };

  const handleOpenQuickPayment = (customer: CustomerItem) => {
    setCustomerForQuickPayment(customer);
    setIsQuickPaymentOpen(true);
  };

  const handleOpenEdit = (customer: CustomerItem) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  };

  const handleOpenAdd = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };

  const promptDelete = (customer: CustomerItem) => {
    if (customer.creditBalance > 0) {
      toast.error(
        `Cannot delete ${customer.name}: Account has an active Khata balance of ${formatCurrency(customer.creditBalance)}. Settle the balance first.`,
      );
      return;
    }
    setCustomerToDelete(customer);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await customersApi.deleteCustomer(customerToDelete.id);
      toast.success(`Customer "${customerToDelete.name}" deleted`);
      setCustomerToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete customer'));
    } finally {
      setIsDeleting(false);
    }
  };

  const summary = data?.summary || {
    totalCustomers: 0,
    totalCreditOutstanding: 0,
    customersWithBalanceCount: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Standardized Header */}
      <PageHeader
        title="Customers & Khata Ledgers"
        description="Manage customer records, track store credit balances, and review chronological ledger accounts."
        icon={Users}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <UserPlus className="size-3.5" />
              <span>Register Customer</span>
            </Button>
          </>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Total Registered"
          value={summary.totalCustomers}
          caption="Customers in store directory"
          icon={Users}
          variant="default"
        />
        <StatCard
          label="Outstanding Khata Debt"
          value={formatCurrency(summary.totalCreditOutstanding)}
          caption="Total store credit owed"
          icon={CreditCard}
          variant={summary.totalCreditOutstanding > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          label="Active Debtors"
          value={summary.customersWithBalanceCount}
          caption="Accounts with open credit"
          icon={Building2}
          variant={summary.customersWithBalanceCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Status Segmented Filter */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                setHasBalanceFilter('all');
                setPage(1);
              });
            }}
            className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
              hasBalanceFilter === 'all'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({summary.totalCustomers})
          </button>
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                setHasBalanceFilter('debt');
                setPage(1);
              });
            }}
            className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer flex items-center gap-1.5 ${
              hasBalanceFilter === 'debt'
                ? 'bg-background text-destructive shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Has Balance</span>
            <span className="font-mono text-micro px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
              {summary.customersWithBalanceCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                setHasBalanceFilter('settled');
                setPage(1);
              });
            }}
            className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
              hasBalanceFilter === 'settled'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Settled
          </button>
        </div>
      </div>

      {/* Customer Data Table */}
      <Card className="overflow-hidden border-border/80 shadow-2xs">
        <CardContent className="p-0">
          {isLoading && !data ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-none">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-24 hidden md:block" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description={
                search
                  ? `No customer records matched "${search}". Try searching by phone number or name.`
                  : 'Start registering regular pharmacy customers to track billing receipts and Khata credit.'
              }
              action={
                !search && (
                  <Button
                    size="sm"
                    onClick={handleOpenAdd}
                    className="gap-1.5 font-semibold text-xs cursor-pointer"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Register First Customer</span>
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/70 text-micro text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4 hidden md:table-cell">Address</th>
                    <th className="py-3 px-4">Khata Balance</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Total Receipts</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data?.data.map((c) => {
                    const balance = Number(c.creditBalance) || 0;
                    const hasDebt = balance > 0;

                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-micro flex items-center justify-center shrink-0">
                              {getInitials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(c)}
                                className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate text-left block"
                              >
                                {c.name}
                              </button>
                              {c.email && (
                                <p className="text-micro text-muted-foreground truncate">
                                  {c.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.phone ? (
                            <span className="tabular-nums text-foreground/90 font-mono text-xs">{c.phone}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>

                        {/* Address */}
                        <td className="py-3 px-4 max-w-xs truncate text-muted-foreground hidden md:table-cell">
                          {c.address || '—'}
                        </td>

                        {/* Khata Balance */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {hasDebt ? (
                            <Badge variant="destructive" className="tabular-nums font-mono font-semibold">
                              {formatCurrency(balance)}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="font-medium">
                              Settled
                            </Badge>
                          )}
                        </td>

                        {/* Purchases Count */}
                        <td className="py-3 px-4 tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {c.totalSalesCount || 0}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDrawer(c)}
                              className="h-7 text-micro px-2 font-medium gap-1 cursor-pointer"
                              title="View full Khata ledger and invoices"
                            >
                              <Receipt className="size-3 text-primary" />
                              <span className="hidden xs:inline">Ledger</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenQuickPayment(c)}
                              className="h-7 text-micro px-2 font-medium gap-1 cursor-pointer"
                              title="Record debt repayment"
                            >
                              <Banknote className="size-3 text-primary" />
                              <span className="hidden xs:inline">Pay</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(c)}
                              className="size-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                              title="Edit customer"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => promptDelete(c)}
                              className="size-7 p-0 cursor-pointer text-muted-foreground hover:text-destructive"
                              title="Delete customer"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {data && data.pagination.totalPages > 1 && (
            <div className="p-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <span className="text-micro">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
                {data.pagination.total} customers
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="size-7 p-0 cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="px-2 tabular-nums font-mono font-medium text-micro">
                  {page} / {data.pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  className="size-7 p-0 cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Customer Registration / Edit Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Customer Full Profile & Ledger Drawer */}
      <CustomerProfileDrawer
        customerId={selectedCustomerIdForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEditCustomer={(cust) => {
          setIsDrawerOpen(false);
          handleOpenEdit(cust);
        }}
        onBalanceUpdated={() => {
          fetchData();
        }}
      />

      {/* Quick Settle Khata Payment Modal */}
      <RecordKhataPaymentModal
        customer={customerForQuickPayment}
        isOpen={isQuickPaymentOpen}
        onClose={() => {
          setIsQuickPaymentOpen(false);
          setCustomerForQuickPayment(null);
        }}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Accessible Non-blocking Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(customerToDelete)}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
        title="Delete Customer Profile"
        description={
          customerToDelete ? (
            <span>
              Are you sure you want to delete <strong>{customerToDelete.name}</strong>? This action will remove their contact profile from the directory.
            </span>
          ) : null
        }
        confirmLabel="Delete Customer"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
