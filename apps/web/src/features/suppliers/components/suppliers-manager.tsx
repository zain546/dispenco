'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

export function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    } catch (err: any) {
      console.error('Fetch suppliers error:', err);
      toast.error('Failed to load suppliers directory');
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save supplier details';
      toast.error(msg);
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete supplier';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="size-7 text-primary" /> Supplier Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage pharmaceutical vendors, lead delivery times, and procurement contact info.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2 font-bold shadow-xs sm:w-auto w-full">
          <Plus className="size-4" /> Add New Supplier
        </Button>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Content Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Truck className="size-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Suppliers Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search ? `No suppliers matched "${search}".` : 'Add your first supplier vendor to start tracking purchase orders.'}
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenAddModal} className="gap-1.5 text-xs font-semibold">
            <Plus className="size-3.5" /> Add Supplier
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className="hover:border-primary/50 transition-colors shadow-xs flex flex-col justify-between"
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1 pr-2">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 leading-tight">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <span className="truncate">{supplier.name}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={supplier.isActive ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> {supplier.leadTimeDays ?? 3}d lead time
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditModal(supplier)}
                    className="size-8 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingSupplier(supplier)}
                    className="size-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 text-xs space-y-2 border-t border-border/40 mt-2 bg-muted/20">
                {supplier.contactPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{supplier.contactPhone}</span>
                  </div>
                )}
                {supplier.contactEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{supplier.contactEmail}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{supplier.address}</span>
                  </div>
                )}
                <div className="pt-2 text-[11px] text-muted-foreground flex justify-between items-center border-t border-border/40">
                  <span>Purchase Orders:</span>
                  <span className="font-bold text-foreground">{supplier.purchaseOrdersCount || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-leadtime" className="text-xs font-medium">
                  Expected Lead Time (Days)
                </Label>
                <Input
                  id="sup-leadtime"
                  type="number"
                  min="0"
                  value={formData.leadTimeDays ?? 3}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs font-medium mb-2">Status</Label>
                <Button
                  type="button"
                  variant={formData.isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className="w-full text-xs gap-1.5 justify-start"
                >
                  {formData.isActive ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-400" /> Active Supplier
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
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs font-bold gap-1.5">
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                {editingSupplier ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">Delete Supplier?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete supplier <strong>{deletingSupplier?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDeletingSupplier(null)} disabled={submitting} className="text-xs">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSupplier} disabled={submitting} className="text-xs font-bold gap-1.5">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Delete Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
