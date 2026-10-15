'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  BadgeAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerItem | null>(null);

  const [selectedCustomerIdForDrawer, setSelectedCustomerIdForDrawer] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [customerForQuickPayment, setCustomerForQuickPayment] = useState<CustomerItem | null>(null);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);

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
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [search, hasBalanceFilter, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timeout);
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

  const handleDelete = async (customer: CustomerItem) => {
    if (customer.creditBalance > 0) {
      toast.error(
        `Cannot delete ${customer.name}: Account has an active Khata balance of PKR ${customer.creditBalance.toLocaleString()}. Settle the balance first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      return;
    }

    try {
      await customersApi.deleteCustomer(customer.id);
      toast.success(`Customer "${customer.name}" deleted`);
      fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to delete customer';
      toast.error(msg);
    }
  };

  const summary = data?.summary || {
    totalCustomers: 0,
    totalCreditOutstanding: 0,
    customersWithBalanceCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <span>Customers & Khata Ledgers</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer profiles, track credit ledger debt, and record balance repayments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <UserPlus className="size-3.5" />
            <span>Register Customer</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Registered</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 font-mono">
                {summary.totalCustomers}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Customers in store directory</p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Outstanding Khata Debt</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-destructive mt-0.5">
                PKR {summary.totalCreditOutstanding.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total store credit owed</p>
            </div>
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <BadgeAlert className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Debtors</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 font-mono">
                {summary.customersWithBalanceCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Accounts with open credit</p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="size-5" />
            </div>
          </CardContent>
        </Card>
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
              setHasBalanceFilter('all');
              setPage(1);
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
              setHasBalanceFilter('debt');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer flex items-center gap-1.5 ${
              hasBalanceFilter === 'debt'
                ? 'bg-background text-destructive shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Has Balance</span>
            <span className="font-mono text-[10px] px-1 py-0.2 rounded-full bg-destructive/10 text-destructive">
              {summary.customersWithBalanceCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setHasBalanceFilter('settled');
              setPage(1);
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
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading customer directory...</span>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Users className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No customers found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {search
                  ? `No customer records matched "${search}". Try searching by phone number or name.`
                  : 'Start registering regular pharmacy customers to track billing receipts and Khata credit.'}
              </p>
              {!search && (
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="mt-2 gap-1.5 font-semibold text-xs cursor-pointer"
                >
                  <UserPlus className="size-3.5" />
                  <span>Register First Customer</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/70 text-[11px] text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Khata Balance</th>
                    <th className="py-3 px-4">Total Orders</th>
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
                            <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p
                                onClick={() => handleOpenDrawer(c)}
                                className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                              >
                                {c.name}
                              </p>
                              {c.email && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {c.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.phone ? (
                            <span className="font-mono text-foreground/90">{c.phone}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>

                        {/* Address */}
                        <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                          {c.address || '—'}
                        </td>

                        {/* Khata Balance */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {hasDebt ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono text-destructive bg-destructive/10 border border-destructive/20">
                              <BadgeAlert className="size-3" />
                              <span>PKR {balance.toLocaleString()}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              <span>Settled</span>
                            </div>
                          )}
                        </td>

                        {/* Purchases Count */}
                        <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                          {c.totalSalesCount || 0} receipts
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDrawer(c)}
                              className="h-7 text-[11px] px-2.5 font-medium gap-1 cursor-pointer"
                              title="View full Khata ledger and invoices"
                            >
                              <Receipt className="size-3 text-primary" />
                              <span>Ledger</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenQuickPayment(c)}
                              className="h-7 text-[11px] px-2.5 font-medium gap-1 cursor-pointer"
                              title="Record debt repayment"
                            >
                              <Banknote className="size-3 text-primary" />
                              <span>Pay</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(c)}
                              className="size-7 p-0 cursor-pointer"
                              title="Edit customer"
                            >
                              <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(c)}
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
              <span>
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
                <span className="px-2 font-mono font-medium">
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

      {/* Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={() => fetchData()}
        customerToEdit={customerToEdit}
      />

      <CustomerProfileDrawer
        customerId={selectedCustomerIdForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEditCustomer={handleOpenEdit}
        onBalanceUpdated={fetchData}
      />

      <RecordKhataPaymentModal
        isOpen={isQuickPaymentOpen}
        onClose={() => setIsQuickPaymentOpen(false)}
        onSuccess={() => fetchData()}
        customer={
          customerForQuickPayment
            ? {
                id: customerForQuickPayment.id,
                name: customerForQuickPayment.name,
                creditBalance: customerForQuickPayment.creditBalance,
              }
            : null
        }
      />
    </div>
  );
}
