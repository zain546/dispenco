'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Camera,
  ShieldAlert,
  Building2,
  Calendar,
  User,
  Phone,
  Eye,
  Pill,
  ShieldCheck,
  ShoppingCart,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  prescriptionsApi,
  PrescriptionData,
  PrescriptionStatus,
} from '../services/prescriptions-api';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { useStore } from '@/context/store-context';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { OcrPrescriptionModal } from './ocr-prescription-modal';

export function PrescriptionsManager() {
  const { stores, activeStoreId, isAllStores } = useStore();
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [controlledOnly, setControlledOnly] = useState(false);

  // Modals
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<PrescriptionData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);

  const effectiveStoreId = !isAllStores && activeStoreId ? activeStoreId : (stores[0]?.id || '');

  const fetchDependencies = async () => {
    try {
      const prodRes = await productsApi.getProducts({ limit: 100 });
      if (prodRes && prodRes.data) {
        setProducts(prodRes.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load products for prescription manager:', err);
    }
  };

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await prescriptionsApi.getPrescriptions({
        storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as PrescriptionStatus),
        search: search.trim() || undefined,
        isControlledOnly: controlledOnly ? true : undefined,
      });

      if (res && res.success) {
        setPrescriptions(res.data || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load prescriptions'));
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, isAllStores, statusFilter, search, controlledOnly]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrescriptions();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPrescriptions]);

  // Dispense handler
  const handleDispense = async (rxId: string) => {
    try {
      setIsDispensing(true);
      const rx = prescriptions.find((p) => p.id === rxId);
      if (!rx) return;

      const itemsPayload = rx.items.map((it) => ({
        itemId: it.id,
        quantityDispensed: it.quantityPrescribed,
      }));

      await prescriptionsApi.dispensePrescription(rxId, {
        notes: 'Dispensed at pharmacy counter',
        items: itemsPayload,
      });

      toast.success(`Prescription ${rx.prescriptionNumber} marked as DISPENSED`);
      setDispenseModalOpen(false);
      setDetailModalOpen(false);
      fetchPrescriptions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to dispense prescription'));
    } finally {
      setIsDispensing(false);
    }
  };

  // Metrics
  const activeCount = prescriptions.filter((p) => p.status === 'ACTIVE').length;
  const controlledCount = prescriptions.filter((p) =>
    p.items.some((it) => it.product?.isControlledSubstance),
  ).length;
  const dispensedCount = prescriptions.filter((p) => p.status === 'DISPENSED').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <PageHeader
        title="Prescription Management & Compliance"
        description="Verify physician prescriptions, inspect clinical directions, and manage controlled narcotic schedules."
        icon={FileText}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setOcrModalOpen(true)}
              className="gap-2 font-bold shadow-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Sparkles className="size-4" />
              <span>Scan Doctor Slip (OCR Assist)</span>
            </Button>
          </div>
        }
      />

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-micro text-muted-foreground font-semibold uppercase tracking-wider block">
                Active Prescriptions
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 block tabular-nums">
                {activeCount}
              </strong>
            </div>
            <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-micro text-muted-foreground font-semibold uppercase tracking-wider block">
                Controlled Substance Rx
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-destructive mt-0.5 block tabular-nums">
                {controlledCount}
              </strong>
            </div>
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-micro text-muted-foreground font-semibold uppercase tracking-wider block">
                Fully Dispensed
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 block tabular-nums">
                {dispensedCount}
              </strong>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-micro text-muted-foreground font-semibold uppercase tracking-wider block">
                Total Recorded
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 block tabular-nums">
                {prescriptions.length}
              </strong>
            </div>
            <div className="size-10 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border/70 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, phone, doctor, Rx number, CNIC..."
              className="pl-9 pr-4 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="ACTIVE" className="text-xs">Active</SelectItem>
                <SelectItem value="DISPENSED" className="text-xs">Dispensed</SelectItem>
                <SelectItem value="PARTIALLY_DISPENSED" className="text-xs">Partial</SelectItem>
                <SelectItem value="EXPIRED" className="text-xs">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={controlledOnly ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setControlledOnly(!controlledOnly)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <ShieldAlert className="size-3.5" />
              <span>Controlled Medicines Only</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrescriptions}
              disabled={loading}
              className="h-9 px-3 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-48 border-border" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          title="No Prescriptions Found"
          description="Scan a doctor slip with OCR Assist or create a new prescription to track patient dispensing."
          action={
            <Button
              size="sm"
              onClick={() => setOcrModalOpen(true)}
              className="gap-2 font-bold text-xs"
            >
              <Sparkles className="size-3.5" />
              <span>Scan Doctor Slip</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => {
            const hasControlled = rx.items.some((it) => it.product?.isControlledSubstance);
            return (
              <Card
                key={rx.id}
                className={`border transition-all hover:border-primary/40 shadow-xs ${
                  hasControlled ? 'border-destructive/30 bg-destructive/2' : 'border-border'
                }`}
              >
                <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary">
                        {rx.prescriptionNumber}
                      </span>
                      <Badge
                        variant={
                          rx.status === 'ACTIVE'
                            ? 'default'
                            : rx.status === 'DISPENSED'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-micro font-semibold"
                      >
                        {rx.status}
                      </Badge>
                      {hasControlled && (
                        <Badge
                          variant="destructive"
                          className="text-micro font-bold gap-1 px-1.5 py-0"
                        >
                          <ShieldAlert className="size-3" />
                          <span>Controlled Rx</span>
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-foreground mt-1 flex items-center gap-1.5">
                      <User className="size-3.5 text-muted-foreground" />
                      <span>{rx.patientName}</span>
                      {rx.patientAge && (
                        <span className="text-xs text-muted-foreground font-normal">
                          ({rx.patientAge}y, {rx.patientGender || 'N/A'})
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="text-right text-micro text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1 justify-end">
                      <Calendar className="size-3 text-muted-foreground/70" />
                      <span>{formatDate(rx.prescriptionDate)}</span>
                    </span>
                    {rx.expiryDate && (
                      <span className="text-micro block mt-0.5">
                        Expires: {formatDate(rx.expiryDate)}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Doctor Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="text-foreground font-semibold">{rx.doctorName}</span>
                      {rx.doctorHospital && <span> • {rx.doctorHospital}</span>}
                    </div>
                    {rx.doctorLicenseNumber && (
                      <Badge variant="outline" className="text-micro font-mono">
                        {rx.doctorLicenseNumber}
                      </Badge>
                    )}
                  </div>

                  {/* Medicines Summary */}
                  <div className="space-y-1 pt-1">
                    <span className="text-micro font-bold uppercase tracking-wider text-muted-foreground block">
                      Prescribed Medicines ({rx.items.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rx.items.map((it) => (
                        <Badge
                          key={it.id}
                          variant="secondary"
                          className={`text-xs gap-1.5 ${
                            it.product?.isControlledSubstance
                              ? 'border-destructive/30 text-destructive font-semibold'
                              : ''
                          }`}
                        >
                          <Pill className="size-3 text-primary" />
                          <span>{it.product?.name || 'Medicine'}</span>
                          <span className="text-muted-foreground text-micro">
                            ({it.quantityPrescribed} {it.product?.unit || 'Units'})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Diagnosis / Instructions */}
                  {rx.diagnosis && (
                    <p className="text-xs text-muted-foreground italic line-clamp-1">
                      Diagnosis: {rx.diagnosis}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRx(rx);
                        setDetailModalOpen(true);
                      }}
                      className="gap-1.5 text-xs h-8 font-semibold"
                    >
                      <Eye className="size-3.5 text-primary" />
                      <span>Inspect Details</span>
                    </Button>

                    {rx.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        onClick={() => handleDispense(rx.id)}
                        disabled={isDispensing}
                        className="gap-1.5 text-xs h-8 font-bold"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Dispense Rx</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* OCR Prescription Modal */}
      <OcrPrescriptionModal
        open={ocrModalOpen}
        onOpenChange={setOcrModalOpen}
        products={products}
        defaultStoreId={effectiveStoreId}
        onSuccess={fetchPrescriptions}
      />

      {/* Prescription Detail Modal */}
      {selectedRx && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <span>Prescription {selectedRx.prescriptionNumber}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {selectedRx.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Recorded on {formatDate(selectedRx.prescriptionDate)} for store {selectedRx.store?.name}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Patient & Doctor Sub-Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <span className="text-micro text-muted-foreground uppercase font-bold tracking-wider block">
                    Patient Information
                  </span>
                  <strong className="text-sm font-bold text-foreground block mt-1">
                    {selectedRx.patientName}
                  </strong>
                  <p className="text-muted-foreground mt-0.5">Phone: {selectedRx.patientPhone || 'N/A'}</p>
                  <p className="text-muted-foreground">CNIC: {selectedRx.patientCnic || 'N/A'}</p>
                  {selectedRx.patientAge && (
                    <p className="text-muted-foreground">
                      Age: {selectedRx.patientAge} years ({selectedRx.patientGender || 'N/A'})
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-micro text-muted-foreground uppercase font-bold tracking-wider block">
                    Prescribing Doctor
                  </span>
                  <strong className="text-sm font-bold text-foreground block mt-1">
                    {selectedRx.doctorName}
                  </strong>
                  <p className="text-muted-foreground mt-0.5">License: {selectedRx.doctorLicenseNumber || 'N/A'}</p>
                  <p className="text-muted-foreground">Hospital: {selectedRx.doctorHospital || 'N/A'}</p>
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Prescribed Clinical Regimen
                </span>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-micro">
                      <tr>
                        <th className="py-2.5 px-3">Medicine</th>
                        <th className="py-2.5 px-3">Dosage & Frequency</th>
                        <th className="py-2.5 px-3 text-right">Prescribed</th>
                        <th className="py-2.5 px-3 text-right">Dispensed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedRx.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground">{it.product?.name}</div>
                            {it.instructions && (
                              <div className="text-micro text-muted-foreground italic">
                                &quot;{it.instructions}&quot;
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div>{it.dosage || '1 unit'} • {it.frequency || 'Daily'}</div>
                            {it.durationDays && (
                              <div className="text-micro text-muted-foreground">
                                Duration: {it.durationDays} days
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {it.quantityPrescribed} {it.product?.unit || 'Units'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-success">
                            {it.quantityDispensed} {it.product?.unit || 'Units'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedRx.notes && (
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-muted-foreground text-micro">
                  <strong>Clinical Notes:</strong> {selectedRx.notes}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              {selectedRx.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  onClick={() => handleDispense(selectedRx.id)}
                  disabled={isDispensing}
                  className="text-xs font-bold gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Mark as Dispensed</span>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
