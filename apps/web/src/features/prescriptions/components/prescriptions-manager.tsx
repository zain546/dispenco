'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  Stethoscope,
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
    <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <PageHeader
        title="Prescription Management & Compliance"
        description="Verify physician prescriptions, inspect clinical directions, and manage controlled narcotic schedules."
        icon={FileText}
        actions={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              onClick={() => setOcrModalOpen(true)}
              className="gap-2 font-bold shadow-xs h-9.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto justify-center"
            >
              <Camera className="size-4" />
              <span>Scan Doctor Slip (OCR Assist)</span>
            </Button>
          </div>
        }
      />

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Prescriptions */}
        <Card className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-foreground/85 leading-snug">
                Active Prescriptions
              </span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {activeCount}
              </strong>
              <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                Active
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Controlled Substance Rx */}
        <Card className="relative overflow-hidden border border-rose-500/25 bg-gradient-to-br from-card via-card to-rose-500/[0.06] shadow-xs hover:border-rose-500/45 transition-colors">
          <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-foreground/85 leading-snug">
                Controlled Drugs
              </span>
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-500 tabular-nums">
                {controlledCount}
              </strong>
              <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                Schedule II-V
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fully Dispensed */}
        <Card className="relative overflow-hidden border border-sky-500/20 bg-gradient-to-br from-card via-card to-sky-500/[0.04] shadow-xs hover:border-sky-500/40 transition-colors">
          <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-foreground/85 leading-snug">
                Fully Dispensed
              </span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {dispensedCount}
              </strong>
              <span className="text-[10px] font-semibold text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded-md">
                Fulfilled
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Recorded */}
        <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-foreground/85 leading-snug">
                Total Prescriptions
              </span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                <Layers className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {prescriptions.length}
              </strong>
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                Recorded
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border/70 shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, doctor, Rx #..."
              className="pl-9 pr-4 h-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs flex-1 sm:w-36 sm:flex-initial">
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
              className="h-9 gap-1.5 text-xs font-semibold shrink-0 px-2.5 sm:px-3"
            >
              <ShieldAlert className="size-3.5" />
              <span className="hidden xs:inline">Controlled Only</span>
              <span className="xs:hidden">Controlled</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrescriptions}
              disabled={loading}
              className="h-9 px-2.5 sm:px-3 gap-1.5 text-xs shrink-0"
              title="Refresh Prescriptions"
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
              <Camera className="size-3.5" />
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
                <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/50 space-y-2">
                  {/* Top Bar: Rx Number, Badges, Dates */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm font-bold text-primary">
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
                        className="text-[11px] font-semibold h-5 px-1.5"
                      >
                        {rx.status}
                      </Badge>
                      {hasControlled && (
                        <Badge
                          variant="destructive"
                          className="text-[11px] font-bold gap-1 h-5 px-1.5 py-0"
                        >
                          <ShieldAlert className="size-3" />
                          <span>Controlled Rx</span>
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-micro text-muted-foreground shrink-0 flex items-center gap-1.5 ml-auto">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground/70" />
                        <span>{formatDate(rx.prescriptionDate)}</span>
                      </span>
                      {rx.expiryDate && (
                        <span className="hidden xs:inline text-muted-foreground/70">
                          • Exp: {formatDate(rx.expiryDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient Line with Avatar */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{rx.patientName}</span>
                          {rx.patientAge && (
                            <span className="text-xs text-muted-foreground font-normal shrink-0">
                              ({rx.patientAge}y{rx.patientGender ? `, ${rx.patientGender}` : ''})
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>
                    {rx.expiryDate && (
                      <span className="xs:hidden text-[10px] text-muted-foreground shrink-0">
                        Exp: {formatDate(rx.expiryDate)}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-4 space-y-3">
                  {/* Doctor Info */}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Stethoscope className="size-3.5 text-primary shrink-0" />
                      <span className="text-foreground font-semibold truncate">{rx.doctorName}</span>
                      {rx.doctorHospital && (
                        <span className="truncate hidden xs:inline">• {rx.doctorHospital}</span>
                      )}
                    </div>
                    {rx.doctorLicenseNumber && (
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0 h-5 px-1.5">
                        {rx.doctorLicenseNumber}
                      </Badge>
                    )}
                  </div>
                  {rx.doctorHospital && (
                    <div className="xs:hidden text-micro text-muted-foreground -mt-2 pl-5 truncate">
                      {rx.doctorHospital}
                    </div>
                  )}

                  {/* Medicines Summary */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-micro font-bold uppercase tracking-wider text-muted-foreground block">
                      Prescribed Medicines ({rx.items.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rx.items.map((it) => (
                        <Badge
                          key={it.id}
                          variant="secondary"
                          className={`text-xs gap-1.5 py-1 px-2 rounded-lg border ${
                            it.product?.isControlledSubstance
                              ? 'border-destructive/30 bg-destructive/10 text-destructive font-semibold'
                              : 'border-border/60 bg-muted/50 text-foreground'
                          }`}
                        >
                          <Pill className="size-3 text-primary shrink-0" />
                          <span className="font-medium">{it.product?.name || 'Medicine'}</span>
                          <span className="text-muted-foreground text-micro">
                            ({it.quantityPrescribed} {it.product?.unit || 'Units'})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Diagnosis / Instructions */}
                  {rx.diagnosis && (
                    <div className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/20 rounded-md p-2 border border-border/40">
                      <span className="font-medium not-italic text-foreground/80">Diagnosis: </span>
                      {rx.diagnosis}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRx(rx);
                        setDetailModalOpen(true);
                      }}
                      className={`gap-1.5 text-xs h-8.5 font-semibold ${
                        rx.status === 'ACTIVE' ? 'flex-1 sm:flex-initial' : 'w-full sm:w-auto'
                      }`}
                    >
                      <Eye className="size-3.5 text-primary" />
                      <span>Inspect Details</span>
                    </Button>

                    {rx.status === 'ACTIVE' && (
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                        <Button
                          asChild
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 text-xs h-8.5 font-semibold text-primary hover:text-primary flex-1 sm:flex-initial"
                        >
                          <Link
                            href={`/pos?customerName=${encodeURIComponent(rx.patientName || '')}&customerPhone=${encodeURIComponent(rx.patientPhone || '')}`}
                          >
                            <ShoppingCart className="size-3.5 text-primary" />
                            <span>Bill in POS</span>
                          </Link>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleDispense(rx.id)}
                          disabled={isDispensing}
                          className="gap-1.5 text-xs h-8.5 font-bold flex-1 sm:flex-initial"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Dispense</span>
                        </Button>
                      </div>
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
          <DialogContent className="w-[calc(100vw-24px)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
            <DialogHeader className="pr-10 sm:pr-12">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2 flex-wrap">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span>Prescription {selectedRx.prescriptionNumber}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {selectedRx.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-micro sm:text-xs text-muted-foreground mt-0.5">
                    Recorded on {formatDate(selectedRx.prescriptionDate)} for store {selectedRx.store?.name}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Patient & Doctor Sub-Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-0.5">
                  <span className="text-micro text-muted-foreground uppercase font-bold tracking-wider block">
                    Patient Information
                  </span>
                  <strong className="text-sm font-bold text-foreground block pt-0.5">
                    {selectedRx.patientName}
                  </strong>
                  <p className="text-muted-foreground">Phone: {selectedRx.patientPhone || 'N/A'}</p>
                  <p className="text-muted-foreground">CNIC: {selectedRx.patientCnic || 'N/A'}</p>
                  {selectedRx.patientAge && (
                    <p className="text-muted-foreground">
                      Age: {selectedRx.patientAge} years ({selectedRx.patientGender || 'N/A'})
                    </p>
                  )}
                </div>

                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-border/60 pt-2.5 sm:pt-0 sm:pl-3">
                  <span className="text-micro text-muted-foreground uppercase font-bold tracking-wider block">
                    Prescribing Doctor
                  </span>
                  <strong className="text-sm font-bold text-foreground block pt-0.5">
                    {selectedRx.doctorName}
                  </strong>
                  <p className="text-muted-foreground">License: {selectedRx.doctorLicenseNumber || 'N/A'}</p>
                  <p className="text-muted-foreground">Hospital: {selectedRx.doctorHospital || 'N/A'}</p>
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Prescribed Clinical Regimen
                </span>
                <div className="border border-border rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-xs">
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

            <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              {selectedRx.status === 'ACTIVE' && (
                <>
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="text-xs font-semibold gap-1.5 text-primary hover:text-primary"
                  >
                    <Link
                      href={`/pos?customerName=${encodeURIComponent(selectedRx.patientName || '')}&customerPhone=${encodeURIComponent(selectedRx.patientPhone || '')}`}
                    >
                      <ShoppingCart className="size-3.5 text-primary" />
                      <span>Transfer to POS Counter</span>
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDispense(selectedRx.id)}
                    disabled={isDispensing}
                    className="text-xs font-bold gap-1.5"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Mark as Dispensed</span>
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
