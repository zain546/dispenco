'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { suppliersApi, SupplierData, CreateSupplierInput } from '../services/suppliers-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  ShoppingCart,
  ShieldCheck,
  LayoutGrid,
  List,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';

export function SuppliersManager() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'fast_lead'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    leadTimeDays: 3,
    isActive: true,
  });

  const fetchSuppliers = async (query?: string) => {
    try {
      setLoading(true);
      const res = await suppliersApi.getSuppliers(query);
      if (res.success) {
        setSuppliers(res.data || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load suppliers directory'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Executive KPI summary calculations
  const summary = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.isActive).length;
    const inactive = total - active;
    const fastLead = suppliers.filter((s) => (s.leadTimeDays ?? 3) <= 2).length;
    const totalOrders = suppliers.reduce((acc, s) => acc + (s.purchaseOrdersCount || 0), 0);
    const avgLead =
      total > 0
        ? (suppliers.reduce((acc, s) => acc + (s.leadTimeDays ?? 3), 0) / total).toFixed(1)
        : '0';

    return {
      total,
      active,
      inactive,
      fastLead,
      totalOrders,
      avgLead,
    };
  }, [suppliers]);

  // Filtered suppliers based on selected status tab
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (statusFilter === 'fast_lead' && (s.leadTimeDays ?? 3) > 2) return false;
      return true;
    });
  }, [suppliers, statusFilter]);

  const handleCopy = (text: string, key: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
      });
    }
  };

  const handleOrderStock = (supplierId: string) => {
    router.push(`/purchases?create=true&supplierId=${supplierId}`);
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      leadTimeDays: 3,
      isActive: true,
    });
    setEditingSupplier(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (supplier: SupplierData) => {
    setFormData({
      name: supplier.name,
      contactPhone: supplier.contactPhone || '',
      contactEmail: supplier.contactEmail || '',
      address: supplier.address || '',
      leadTimeDays: supplier.leadTimeDays ?? 3,
      isActive: supplier.isActive ?? true,
    });
    setEditingSupplier(supplier);
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSupplier) {
        await suppliersApi.updateSupplier(editingSupplier.id, formData);
        toast.success(`Supplier "${formData.name}" updated successfully`);
      } else {
        await suppliersApi.createSupplier(formData);
        toast.success(`Supplier "${formData.name}" created successfully`);
      }
      setIsAddModalOpen(false);
      fetchSuppliers(search);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save supplier details'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    setSubmitting(true);
    try {
      await suppliersApi.deleteSupplier(deletingSupplier.id);
      toast.success(`Supplier "${deletingSupplier.name}" deleted successfully`);
      setDeletingSupplier(null);
      fetchSuppliers(search);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to delete supplier'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <PageHeader
        title="Supplier Directory"
        description="Manage pharmaceutical vendors, lead delivery times, and procurement contact info."
        icon={Truck}
        actions={
          <Button onClick={handleOpenAddModal} className="gap-2 font-bold shadow-xs cursor-pointer">
            <Plus className="size-4" /> Add New Supplier
          </Button>
        }
      />

      {/* Top Executive KPI StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Total Suppliers"
          value={loading ? '...' : summary.total.toString()}
          caption="Registered vendor partners"
          icon={Building2}
          variant="default"
        />
        <StatCard
          label="Active Vendors"
          value={loading ? '...' : summary.active.toString()}
          caption={`${summary.active} of ${summary.total} ready for orders`}
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          label="Avg. Delivery Lead Time"
          value={loading ? '...' : `${summary.avgLead} Days`}
          caption="Replenishment fulfillment window"
          icon={Clock}
          variant="default"
        />
        <StatCard
          label="Total Purchase Orders"
          value={loading ? '...' : summary.totalOrders.toString()}
          caption="All-time procurement shipments"
          icon={ShoppingCart}
          variant="default"
        />
      </div>

      {/* Filter, Search & View Mode Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, phone, email, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Filter Segment & View Mode */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Segmented Filter Chips */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({summary.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="size-1.5 rounded-full bg-success" />
              Active ({summary.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('fast_lead')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === 'fast_lead'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Fast (≤2d) ({summary.fastLead})
            </button>
            {summary.inactive > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === 'inactive'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Inactive ({summary.inactive})
              </button>
            )}
          </div>

          {/* View Mode Toggle (Grid vs Table) */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-2.5 text-xs gap-1.5 cursor-pointer rounded-md ${
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-7 px-2.5 text-xs gap-1.5 cursor-pointer rounded-md ${
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Table</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area: Grid View or Table View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-3 border-border/80">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={search || statusFilter !== 'all' ? 'No Matching Suppliers' : 'No Suppliers Found'}
          description={
            search || statusFilter !== 'all'
              ? 'No pharmaceutical suppliers match your current filter criteria.'
              : 'Add your first supplier vendor to start tracking purchase orders and delivery times.'
          }
          action={
            search || statusFilter !== 'all' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddModal}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Plus className="size-3.5" /> Add Supplier
              </Button>
            )
          }
        />
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className="hover:border-primary/50 transition-all shadow-2xs flex flex-col justify-between border-border/80 group"
            >
              <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1.5 pr-2 min-w-0">
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2 leading-tight">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <span className="truncate">{supplier.name}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge variant={supplier.isActive ? 'success' : 'neutral'} size="xs" dot>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock className="size-3 text-primary" /> {supplier.leadTimeDays ?? 3}d lead time
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(supplier)}
                          className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit Supplier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingSupplier(supplier)}
                          className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete Supplier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-3 text-xs space-y-2.5 border-t border-border/50 bg-muted/15 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  {supplier.contactPhone ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="size-3.5 text-primary shrink-0" />
                        <a
                          href={`tel:${supplier.contactPhone}`}
                          className="font-medium text-foreground hover:text-primary transition-colors truncate"
                        >
                          {supplier.contactPhone}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(supplier.contactPhone!, `phone-${supplier.id}`, 'Phone number')}
                        className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                        title="Copy phone"
                      >
                        {copiedKey === `phone-${supplier.id}` ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground/60 shrink-0" />
                      <span>No phone on record</span>
                    </div>
                  )}

                  {supplier.contactEmail ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="size-3.5 text-primary shrink-0" />
                        <a
                          href={`mailto:${supplier.contactEmail}`}
                          className="hover:text-primary transition-colors truncate text-foreground"
                        >
                          {supplier.contactEmail}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(supplier.contactEmail!, `email-${supplier.id}`, 'Email')}
                        className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                        title="Copy email"
                      >
                        {copiedKey === `email-${supplier.id}` ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground/60 shrink-0" />
                      <span>No email on record</span>
                    </div>
                  )}

                  {supplier.address ? (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed text-foreground/90">{supplier.address}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic flex items-center gap-2">
                      <MapPin className="size-3.5 text-muted-foreground/60 shrink-0" />
                      <span>No address specified</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Purchase Orders:</span>
                    <Badge variant="outline" className="font-bold text-foreground text-micro px-2 py-0.5">
                      {supplier.purchaseOrdersCount || 0}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOrderStock(supplier.id)}
                    className="gap-1.5 text-xs font-semibold h-8 bg-card hover:bg-primary hover:text-primary-foreground border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="size-3.5" />
                    <span>Order Stock</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE SPREADSHEET VIEW */
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/80 hover:bg-transparent">
                <TableHead className="w-[240px] text-xs font-bold text-foreground">Supplier Name</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Lead Time</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Contact Phone</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Email</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Address / City</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Orders</TableHead>
                <TableHead className="text-right text-xs font-bold text-foreground pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-semibold text-xs py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-primary shrink-0" />
                      <span className="text-foreground">{supplier.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusBadge variant={supplier.isActive ? 'success' : 'neutral'} size="xs" dot>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="flex items-center gap-1 text-muted-foreground font-medium">
                      <Clock className="size-3 text-primary shrink-0" />
                      <span>{supplier.leadTimeDays ?? 3} Days</span>
                      {(supplier.leadTimeDays ?? 3) <= 2 && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1 py-0 ml-1">
                          Fast
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {supplier.contactPhone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${supplier.contactPhone}`}
                          className="text-foreground hover:text-primary transition-colors font-medium"
                        >
                          {supplier.contactPhone}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(supplier.contactPhone!, `tbl-phone-${supplier.id}`, 'Phone')}
                          className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                        >
                          {copiedKey === `tbl-phone-${supplier.id}` ? (
                            <Check className="size-3 text-success" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {supplier.contactEmail ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${supplier.contactEmail}`}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {supplier.contactEmail}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(supplier.contactEmail!, `tbl-email-${supplier.id}`, 'Email')}
                          className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                        >
                          {copiedKey === `tbl-email-${supplier.id}` ? (
                            <Check className="size-3 text-success" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate py-3" title={supplier.address || ''}>
                    {supplier.address || <span className="italic">—</span>}
                  </TableCell>
                  <TableCell className="text-center py-3">
                    <Badge variant="outline" className="font-bold text-foreground text-micro">
                      {supplier.purchaseOrdersCount || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOrderStock(supplier.id)}
                        className="gap-1 h-7 text-xs font-semibold px-2 bg-card hover:bg-primary hover:text-primary-foreground border-border cursor-pointer"
                      >
                        <ShoppingCart className="size-3" />
                        <span>Order</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(supplier)}
                        className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingSupplier(supplier)}
                        className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Supplier Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingSupplier
                ? 'Update contact details and lead delivery time for this supplier.'
                : 'Register a new pharmaceutical distributor or vendor.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name" className="text-xs font-semibold">
                Supplier Name *
              </Label>
              <Input
                id="sup-name"
                placeholder="e.g., Premier Pharma Distributors"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-phone" className="text-xs font-medium">
                  Contact Phone
                </Label>
                <Input
                  id="sup-phone"
                  placeholder="+92 300 1234567"
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sup-email" className="text-xs font-medium">
                  Contact Email
                </Label>
                <Input
                  id="sup-email"
                  type="email"
                  placeholder="vendor@pharma.com"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-address" className="text-xs font-medium">
                Warehouse / Office Address
              </Label>
              <Input
                id="sup-address"
                placeholder="Plot 45, Industrial Zone, Lahore"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="sup-leadtime" className="text-xs font-medium flex items-center justify-between">
                  <span>Expected Lead Time</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Days)</span>
                </Label>
                <Input
                  id="sup-leadtime"
                  type="number"
                  min="0"
                  max="90"
                  value={formData.leadTimeDays ?? 3}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: Math.max(0, Number(e.target.value)) })}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Days for distributor delivery to reach store</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium mb-1.5 block">Vendor Status</Label>
                <Button
                  type="button"
                  variant={formData.isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className="w-full text-xs gap-1.5 justify-start h-9 cursor-pointer"
                >
                  {formData.isActive ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-success" /> Active Supplier
                    </>
                  ) : (
                    <>
                      <XCircle className="size-3.5 text-muted-foreground" /> Inactive
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={submitting}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs font-bold gap-1.5 cursor-pointer">
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                {editingSupplier ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deletingSupplier}
        onOpenChange={() => setDeletingSupplier(null)}
        title="Delete Supplier"
        description={
          deletingSupplier ? (
            <span>
              Are you sure you want to delete supplier <strong>{deletingSupplier.name}</strong>? This action cannot be undone.
            </span>
          ) : (
            'Are you sure you want to delete this supplier?'
          )
        }
        confirmLabel="Delete Supplier"
        variant="destructive"
        isLoading={submitting}
        onConfirm={handleDeleteSupplier}
      />
    </div>
  );
}
