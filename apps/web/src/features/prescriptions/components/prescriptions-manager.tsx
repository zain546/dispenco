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
  X,
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
import { StatCard } from '@/components/ui/stat-card';
import {
  prescriptionsApi,
  PrescriptionData,
  PrescriptionStatus,
  PrescriptionsSummary,
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
  const [summary, setSummary] = useState<PrescriptionsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [controlledOnly, setControlledOnly] = useState(false);

  // Modals
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrModalMode, setOcrModalMode] = useState<'ocr' | 'manual'>('ocr');
  const [selectedRx, setSelectedRx] = useState<PrescriptionData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);

  const effectiveStoreId = !isAllStores && activeStoreId ? activeStoreId : (stores[0]?.id || '');

  const isPrescriptionExpired = (rx: PrescriptionData) => {
    if (!rx.expiryDate) return false;
    const exp = new Date(rx.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
  };

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
        if (res.summary) {
          setSummary(res.summary);
        }
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

  // Metrics (prioritizes store-wide server aggregates to avoid client filter skew)
  const activeCount = summary ? summary.activeCount : prescriptions.filter((p) => p.status === 'ACTIVE').length;
  const controlledCount = summary
    ? summary.controlledCount
    : prescriptions.filter((p) => p.items.some((it) => it.product?.isControlledSubstance)).length;
  const dispensedCount = summary
    ? summary.dispensedCount
    : prescriptions.filter((p) => p.status === 'DISPENSED').length;
  const totalCount = summary ? summary.totalPrescriptions : prescriptions.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Standardized Page Header */}
      <PageHeader
        title="Prescription Management & Compliance"
        description="Verify physician prescriptions, inspect clinical directions, and manage controlled narcotic schedules."
        icon={FileText}
        actions={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOcrModalMode('manual');
                setOcrModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              <Plus className="size-3.5" />
              <span>Enter Manually</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setOcrModalMode('ocr');
                setOcrModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Camera className="size-3.5" />
              <span>Scan Doctor Slip (OCR Assist)</span>
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Prescriptions"
          value={activeCount}
          caption="Awaiting fulfillment"
          icon={CheckCircle2}
          variant={activeCount > 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Controlled Drugs"
          value={controlledCount}
          caption="Schedule II-V regulated"
          icon={ShieldAlert}
          variant={controlledCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Fully Dispensed"
          value={dispensedCount}
          caption="Fulfilled at counter"
          icon={ShieldCheck}
          variant="default"
        />
        <StatCard
          label="Total Recorded"
          value={totalCount}
          caption="Prescriptions on record"
          icon={Layers}
          variant="default"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, doctor, Rx #..."
            className="pl-9 pr-8 h-9 text-xs w-full bg-background"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-full sm:w-36 bg-background">
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
            className="h-9 gap-1.5 text-xs font-medium shrink-0 px-3 cursor-pointer"
          >
            <ShieldAlert className="size-3.5" />
            <span>Controlled Only</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPrescriptions}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs shrink-0 cursor-pointer"
            title="Refresh Prescriptions"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Prescriptions List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-48 rounded-xl border border-border/80 bg-card p-5" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          title="No Prescriptions Found"
          description="Scan a doctor slip with OCR Assist or create a new prescription to track patient dispensing."
          action={
            <Button
              size="sm"
              onClick={() => {
                setOcrModalMode('ocr');
                setOcrModalOpen(true);
              }}
              className="gap-2 font-medium text-xs cursor-pointer shadow-xs"
            >
              <Camera className="size-3.5" />
              <span>Scan Doctor Slip</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => {
            const isExpired = rx.status === 'ACTIVE' && isPrescriptionExpired(rx);
            const hasControlled = rx.items.some((it) => it.product?.isControlledSubstance);

            return (
              <div
                key={rx.id}
                className="border border-border/80 hover:border-border transition-colors bg-card rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4"
              >
                {/* Header & Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-foreground tracking-tight">
                        {rx.prescriptionNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium h-5 px-1.5 ${
                          rx.status === 'ACTIVE'
                            ? 'text-success bg-success/10 border-success/20'
                            : rx.status === 'DISPENSED'
                            ? 'text-muted-foreground bg-muted border-border'
                            : rx.status === 'PARTIALLY_DISPENSED'
                            ? 'text-warning bg-warning/10 border-warning/20'
                            : 'text-destructive bg-destructive/10 border-destructive/20'
                        }`}
                      >
                        {rx.status}
                      </Badge>
                      {isExpired && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium text-warning bg-warning/10 border-warning/20 gap-1 h-5 px-1.5"
                        >
                          <AlertTriangle className="size-3" />
                          <span>Expired</span>
                        </Badge>
                      )}
                      {hasControlled && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium text-destructive bg-destructive/10 border-destructive/20 gap-1 h-5 px-1.5"
                        >
                          <ShieldAlert className="size-3" />
                          <span>Controlled</span>
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1.5 ml-auto">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span>{formatDate(rx.prescriptionDate)}</span>
                    </span>
                  </div>

                  {/* Patient & Validity */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-1 border-t border-border/50">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {rx.patientName}{' '}
                        {rx.patientAge && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({rx.patientAge}y{rx.patientGender ? `, ${rx.patientGender}` : ''})
                          </span>
                        )}
                      </h4>
                      {(rx.patientPhone || rx.patientCnic) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rx.patientPhone || 'No phone'}
                          {rx.patientCnic && ` • CNIC: ${rx.patientCnic}`}
                        </p>
                      )}
                    </div>
                    {rx.expiryDate && (
                      <span
                        className={`text-xs tabular-nums shrink-0 ${
                          isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {isExpired ? 'Expired: ' : 'Valid until: '}
                        {formatDate(rx.expiryDate)}
                      </span>
                    )}
                  </div>

                  {/* Prescriber Line (Clean inline) */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/40 truncate">
                    <Stethoscope className="size-3.5 text-primary shrink-0" />
                    <span className="text-foreground font-medium truncate">
                      {rx.doctorName.toLowerCase().startsWith('dr') ? rx.doctorName : `Dr. ${rx.doctorName}`}
                    </span>
                    {rx.doctorHospital && <span className="truncate">• {rx.doctorHospital}</span>}
                    {rx.doctorLicenseNumber && (
                      <span className="font-mono text-muted-foreground/80 shrink-0">
                        ({rx.doctorLicenseNumber})
                      </span>
                    )}
                  </div>

                  {/* Prescribed Medicines */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Prescribed Medicines ({rx.items.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rx.items.map((it) => (
                        <Badge
                          key={it.id}
                          variant="secondary"
                          className="text-xs font-normal gap-1.5 py-1 px-2.5 rounded-lg border border-border/60 bg-muted/60 text-foreground"
                        >
                          <Pill
                            className={`size-3 shrink-0 ${
                              it.product?.isControlledSubstance ? 'text-destructive' : 'text-primary'
                            }`}
                          />
                          <span className="font-medium">{it.product?.name || 'Medicine'}</span>
                          <span className="text-muted-foreground font-normal">
                            ({it.quantityPrescribed} {it.product?.unit || 'Units'})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {rx.diagnosis && (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="font-medium not-italic text-foreground">Diagnosis: </span>
                      {rx.diagnosis}
                    </p>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRx(rx);
                      setDetailModalOpen(true);
                    }}
                    className="gap-1.5 text-xs h-8 font-medium cursor-pointer"
                  >
                    <Eye className="size-3.5 text-muted-foreground" />
                    <span>Inspect Details</span>
                  </Button>

                  {rx.status === 'ACTIVE' && (
                    <div className="flex items-center gap-2">
                      {isExpired ? (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium text-warning border-warning/30 bg-warning/10 gap-1 h-8 px-2.5"
                        >
                          <AlertTriangle className="size-3.5" />
                          <span>Expired (DRAP Locked)</span>
                        </Badge>
                      ) : (
                        <>
                          <Button
                            asChild
                            size="sm"
                            className="gap-1.5 text-xs h-8 font-medium cursor-pointer shadow-xs whitespace-nowrap px-3"
                          >
                            <Link
                              href={`/pos?prescriptionId=${rx.id}&customerName=${encodeURIComponent(rx.patientName || '')}&customerPhone=${encodeURIComponent(rx.patientPhone || '')}&doctorName=${encodeURIComponent(rx.doctorName || '')}`}
                            >
                              <ShoppingCart className="size-3.5 shrink-0" />
                              <span>Bill in POS</span>
                            </Link>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDispense(rx.id)}
                            disabled={isDispensing}
                            className="gap-1.5 text-xs h-8 font-medium text-success border-success/30 hover:bg-success/10 cursor-pointer whitespace-nowrap px-3"
                          >
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            <span>Dispense</span>
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {rx.status === 'DISPENSED' && (
                    <span className="text-xs font-medium text-success flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Dispensed</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OCR & Prescription Entry Modal */}
      <OcrPrescriptionModal
        open={ocrModalOpen}
        onOpenChange={setOcrModalOpen}
        products={products}
        defaultStoreId={effectiveStoreId}
        onSuccess={fetchPrescriptions}
        initialMode={ocrModalMode}
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
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Recorded on {formatDate(selectedRx.prescriptionDate)} for store {selectedRx.store?.name}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Patient & Doctor Sub-Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
                    Patient Information
                  </span>
                  <strong className="text-sm font-semibold text-foreground block pt-0.5">
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
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
                    Prescribing Doctor
                  </span>
                  <strong className="text-sm font-semibold text-foreground block pt-0.5">
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
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-xs">
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
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{it.product?.name}</span>
                              {it.product?.isControlledSubstance && (
                                <Badge variant="destructive" className="text-xs px-1 py-0">
                                  Controlled
                                </Badge>
                              )}
                            </div>
                            {it.instructions && (
                              <div className="text-xs text-muted-foreground italic">
                                &quot;{it.instructions}&quot;
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div>{it.dosage || '1 unit'} • {it.frequency || 'Daily'}</div>
                            {it.durationDays && (
                              <div className="text-xs text-muted-foreground">
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

              {/* Compliance Warning for Controlled Drugs missing CNIC */}
              {selectedRx.items.some((it) => it.product?.isControlledSubstance) && !selectedRx.patientCnic && (
                <div className="p-3 rounded-xl border border-warning/30 bg-warning/10 flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning font-medium leading-relaxed">
                    <strong>Regulatory Notice:</strong> Patient CNIC is missing. DRAP guidelines require patient National ID / CNIC for controlled Schedule II–V dispensing records.
                  </p>
                </div>
              )}

              {/* Dispensing Audit Link if Dispensed */}
              {selectedRx.sale && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-success/20 text-success flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Dispensed at POS Counter (Receipt #{selectedRx.sale.receiptNumber})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Billed Amount: {Number(selectedRx.sale.totalAmount).toLocaleString()} PKR • Dispensing Audit Verified
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-success/40 text-success text-xs shrink-0">
                    Fulfilled
                  </Badge>
                </div>
              )}

              {selectedRx.notes && (
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-muted-foreground text-xs">
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
                  {isPrescriptionExpired(selectedRx) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.error(
                          `Prescription expired on ${selectedRx.expiryDate ? formatDate(selectedRx.expiryDate) : 'due date'}. Under DRAP regulations, expired prescriptions require physician re-authorization.`
                        )
                      }
                      className="text-xs font-medium gap-1.5 text-warning border-warning/30 hover:bg-warning/10 cursor-pointer"
                    >
                      <AlertTriangle className="size-3.5" />
                      <span>Prescription Expired (Locked)</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        asChild
                        size="sm"
                        className="text-xs font-medium gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Link
                          href={`/pos?prescriptionId=${selectedRx.id}&customerName=${encodeURIComponent(selectedRx.patientName || '')}&customerPhone=${encodeURIComponent(selectedRx.patientPhone || '')}&doctorName=${encodeURIComponent(selectedRx.doctorName || '')}`}
                        >
                          <ShoppingCart className="size-3.5 shrink-0" />
                          <span>Transfer to POS Counter</span>
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDispense(selectedRx.id)}
                        disabled={isDispensing}
                        className="text-xs font-medium gap-1.5 text-success border-success/30 hover:bg-success/10 cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Mark as Dispensed</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
