'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  Camera,
  ShieldAlert,
  Building2,
  Calendar,
  User,
  Phone,
  Hash,
  Pill,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  prescriptionsApi,
  PrescriptionOcrResponse,
  ExtractedPrescriptionItem,
} from '../services/prescriptions-api';
import { ProductData } from '@/features/inventory/services/products-api';
import { getErrorMessage } from '@/lib/errors';

interface OcrPrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductData[];
  defaultStoreId: string;
  onSuccess: () => void;
}

export function OcrPrescriptionModal({
  open,
  onOpenChange,
  products,
  defaultStoreId,
  onSuccess,
}: OcrPrescriptionModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review & Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientCnic, setPatientCnic] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorLicenseNumber, setDoctorLicenseNumber] = useState('');
  const [doctorHospital, setDoctorHospital] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0.95);
  const [ocrEngine, setOcrEngine] = useState<string>('smart-heuristic-parser');

  const [items, setItems] = useState<
    Array<
      ExtractedPrescriptionItem & {
        id: string;
      }
    >
  >([]);

  const resetState = () => {
    setStep('upload');
    setIsProcessing(false);
    setIsSaving(false);
    setFileName('');
    setPatientName('');
    setPatientPhone('');
    setPatientAge('');
    setPatientGender('Male');
    setPatientCnic('');
    setDoctorName('');
    setDoctorLicenseNumber('');
    setDoctorHospital('');
    setPrescriptionDate('');
    setExpiryDate('');
    setDiagnosis('');
    setNotes('');
    setItems([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image (PNG, JPG, WebP) or PDF file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await runOcr(base64Data, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const runOcr = async (imageBase64: string, mimeType: string, name: string) => {
    setIsProcessing(true);
    try {
      const res = await prescriptionsApi.scanPrescriptionOcr({
        imageBase64,
        mimeType,
        fileName: name,
        storeId: defaultStoreId,
      });

      if (res && res.success) {
        setOcrConfidence(res.confidence);
        setOcrEngine(res.ocrEngine);
        setPatientName(res.patient.name || '');
        setPatientPhone(res.patient.phone || '');
        setPatientAge(res.patient.age || '');
        setPatientGender(res.patient.gender || 'Male');
        setPatientCnic(res.patient.cnic || '');
        setDoctorName(res.doctor.name || '');
        setDoctorLicenseNumber(res.doctor.licenseNumber || '');
        setDoctorHospital(res.doctor.hospital || '');
        setPrescriptionDate(res.prescriptionDate);
        setExpiryDate(res.expiryDate || '');
        setDiagnosis(res.diagnosis || '');
        setNotes(res.notes || '');

        const mappedItems = (res.items || []).map((it, idx) => ({
          ...it,
          id: `rx-item-${idx}-${Date.now()}`,
          matchedProductId:
            it.matchedProductId || (products.length > 0 ? products[0].id : null),
        }));
        setItems(mappedItems);

        setStep('review');
        toast.success(
          `Extracted prescription details with ${Math.round(res.confidence * 100)}% accuracy`,
        );
      } else {
        toast.error('Could not extract details from prescription slip.');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to scan prescription slip'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateSampleRx = () => {
    const dummyImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    setFileName('sample_doctor_prescription_slip.png');
    runOcr(dummyImage, 'image/png', 'sample_doctor_prescription_slip.png');
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ExtractedPrescriptionItem,
    val: any,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: val };

      if (field === 'matchedProductId') {
        const found = products.find((p) => p.id === val);
        if (found) {
          cur.matchedProductName = found.name;
          cur.unit = found.unit;
          cur.category = found.category;
          cur.genericName = found.genericName;
          cur.isControlledSubstance = Boolean(found.isControlledSubstance);
          cur.isNewProduct = false;
        }
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        id: `rx-item-${Date.now()}`,
        rawMedicineName: firstProd ? firstProd.name : 'New Medicine',
        matchedProductId: firstProd ? firstProd.id : null,
        matchedProductName: firstProd ? firstProd.name : 'Selected Medicine',
        dosage: '1 Tablet',
        frequency: 'Twice daily (BD)',
        durationDays: 5,
        quantityPrescribed: 10,
        instructions: 'After meals',
        confidence: 1.0,
        isControlledSubstance: Boolean(firstProd?.isControlledSubstance),
        isNewProduct: false,
      },
    ]);
  };

  const hasControlledSubstances = items.some((it) => it.isControlledSubstance);

  const handleConfirmSave = async () => {
    if (!patientName.trim()) {
      toast.error('Patient name is required.');
      return;
    }
    if (!doctorName.trim()) {
      toast.error('Prescribing doctor name is required.');
      return;
    }
    if (items.length === 0) {
      toast.error('Prescription must have at least one prescribed medicine.');
      return;
    }

    const unmapped = items.find((it) => !it.matchedProductId);
    if (unmapped) {
      toast.error(`Please select a catalog product for "${unmapped.rawMedicineName}".`);
      return;
    }

    try {
      setIsSaving(true);
      await prescriptionsApi.createPrescription({
        storeId: defaultStoreId,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        patientAge: patientAge !== '' ? Number(patientAge) : undefined,
        patientGender: patientGender || undefined,
        patientCnic: patientCnic.trim() || undefined,
        doctorName: doctorName.trim(),
        doctorLicenseNumber: doctorLicenseNumber.trim() || undefined,
        doctorHospital: doctorHospital.trim() || undefined,
        prescriptionDate: prescriptionDate || new Date().toISOString(),
        expiryDate: expiryDate || undefined,
        diagnosis: diagnosis.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          productId: it.matchedProductId!,
          dosage: it.dosage || undefined,
          frequency: it.frequency || undefined,
          durationDays: it.durationDays ? Number(it.durationDays) : undefined,
          quantityPrescribed: Number(it.quantityPrescribed) || 1,
          instructions: it.instructions || undefined,
        })),
      });

      toast.success('Prescription verified and registered in database.');
      onSuccess();
      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save prescription'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetState();
        onOpenChange(val);
      }}
    >
      <DialogContent className="w-[calc(100vw-20px)] sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="p-3.5 sm:p-6 pr-11 sm:pr-14 border-b border-border/60 bg-muted/20 shrink-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <FileText className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <DialogTitle className="text-sm sm:text-lg font-bold text-foreground">
                    Prescription OCR & Verification
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-micro font-semibold hidden xs:inline-flex"
                  >
                    Clinical Compliance
                  </Badge>
                </div>
                <DialogDescription className="text-micro sm:text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                  Scan doctor slips to automatically extract patient details, dosage directions, and cross-reference controlled substances.
                </DialogDescription>
              </div>
            </div>
            {step === 'review' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('upload')}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 h-8"
              >
                <RefreshCw className="size-3.5" />
                <span className="hidden sm:inline">Re-scan</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {step === 'upload' ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Dropzone */}
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 sm:gap-4 ${
                  isProcessing
                    ? 'border-primary/50 bg-primary/5 pointer-events-none'
                    : 'border-border/80 hover:border-primary/60 hover:bg-muted/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative">
                      <div className="size-14 sm:size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="size-5 sm:size-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="font-semibold text-sm text-foreground">
                      Reading doctor handwriting & typography...
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Extracting patient details, prescribing doctor license, dosage instructions, and checking controlled medicine schedules...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                      <UploadCloud className="size-6 sm:size-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground">
                        Upload or snap doctor prescription slip
                      </h4>
                      <p className="text-micro sm:text-xs text-muted-foreground mt-1 max-w-md">
                        Supports photographed medical receipts, clinical hospital slips, and PDF prescriptions (PNG, JPG, WebP, PDF).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1 sm:pt-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs font-semibold w-full sm:w-auto h-9 justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera className="size-3.5" />
                        <span>Select Photo / Camera Capture</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Demo 1-Click Sandbox Test */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 sm:size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <FileText className="size-4 sm:size-5" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-xs text-foreground">
                        Don&apos;t have a paper prescription right now?
                      </h5>
                      <p className="text-micro text-muted-foreground mt-0.5">
                        Test the prescription OCR extractor, clinical directions, and controlled substance matching with verified sample data.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={handleSimulateSampleRx}
                    className="gap-1.5 shrink-0 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 h-8.5 w-full sm:w-auto justify-center"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Try Sample Prescription Slip</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Review & Edit Step */
            <div className="space-y-6">
              {/* Controlled Substance Alert Banner */}
              {hasControlledSubstances && (
                <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 flex items-start gap-3">
                  <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-destructive">
                      Controlled Substance Schedule Warning
                    </h5>
                    <p className="text-micro text-destructive/90 mt-0.5">
                      This prescription contains medicines designated as controlled substances. Ensure prescribing doctor license # and patient CNIC are recorded before dispensing.
                    </p>
                  </div>
                </div>
              )}

              {/* Patient Information Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5" />
                  <span>Patient Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Patient Full Name *</Label>
                    <Input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Muhammad Tariq"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      type="text"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+92 300..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Age</Label>
                    <Input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Age"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">National ID / CNIC</Label>
                    <Input
                      type="text"
                      value={patientCnic}
                      onChange={(e) => setPatientCnic(e.target.value)}
                      placeholder="e.g. 35201-XXXXXXX-X"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select value={patientGender} onValueChange={setPatientGender}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male" className="text-xs">Male</SelectItem>
                        <SelectItem value="Female" className="text-xs">Female</SelectItem>
                        <SelectItem value="Other" className="text-xs">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Doctor Information Section */}
              <div className="space-y-3 border-t border-border/60 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  <span>Prescribing Physician / Doctor</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Doctor Name *</Label>
                    <Input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. Full Name"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Medical License / PMC #</Label>
                    <Input
                      type="text"
                      value={doctorLicenseNumber}
                      onChange={(e) => setDoctorLicenseNumber(e.target.value)}
                      placeholder="PMC-XXXXX-P"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Hospital / Clinic</Label>
                    <Input
                      type="text"
                      value={doctorHospital}
                      onChange={(e) => setDoctorHospital(e.target.value)}
                      placeholder="Hospital Name"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Prescription Date</Label>
                    <Input
                      type="date"
                      value={prescriptionDate}
                      onChange={(e) => setPrescriptionDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Expiry Date (Valid Until)</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Diagnosis / Indication</Label>
                    <Input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Upper Respiratory Infection"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div className="space-y-3 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Pill className="size-3.5" />
                    <span>Prescribed Medicines ({items.length})</span>
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="gap-1.5 text-xs h-7"
                  >
                    <Plus className="size-3" />
                    <span>Add Medicine</span>
                  </Button>
                </div>

                <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-micro tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Catalog Match</th>
                          <th className="py-2.5 px-3 w-28">Dosage</th>
                          <th className="py-2.5 px-3 min-w-[130px]">Frequency</th>
                          <th className="py-2.5 px-3 w-20">Days</th>
                          <th className="py-2.5 px-3 w-20">Qty</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Instructions</th>
                          <th className="py-2.5 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 text-muted-foreground font-mono text-micro">
                              {idx + 1}
                            </td>

                            {/* Catalog Selector */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <Select
                                  value={item.matchedProductId || ''}
                                  onValueChange={(val) =>
                                    handleUpdateItem(idx, 'matchedProductId', val)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select catalog medicine..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={p.id} className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span>{p.name} ({p.unit})</span>
                                          {p.isControlledSubstance && (
                                            <Badge variant="destructive" className="text-micro px-1 py-0">
                                              Rx Schedule
                                            </Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
                                  <span>OCR: &quot;{item.rawMedicineName}&quot;</span>
                                  {item.isControlledSubstance && (
                                    <Badge variant="destructive" className="text-micro px-1 py-0">
                                      Controlled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Dosage */}
                            <td className="py-2.5 px-3">
                              <Input
                                type="text"
                                value={item.dosage || ''}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'dosage', e.target.value)
                                }
                                placeholder="e.g. 500mg"
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Frequency */}
                            <td className="py-2.5 px-3">
                              <Input
                                type="text"
                                value={item.frequency || ''}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'frequency', e.target.value)
                                }
                                placeholder="e.g. Twice daily"
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Duration Days */}
                            <td className="py-2.5 px-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.durationDays || 5}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'durationDays', Number(e.target.value))
                                }
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Qty */}
                            <td className="py-2.5 px-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantityPrescribed}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'quantityPrescribed', Number(e.target.value))
                                }
                                className="h-8 text-xs font-semibold"
                              />
                            </td>

                            {/* Instructions */}
                            <td className="py-2.5 px-3">
                              <Input
                                type="text"
                                value={item.instructions || ''}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'instructions', e.target.value)
                                }
                                placeholder="Directions..."
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Delete */}
                            <td className="py-2.5 px-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(idx)}
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-muted/30 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="size-4 text-warning shrink-0" />
                    <span>
                      Explicit human pharmacist confirmation is required. Verify that medicine strengths match the doctor slip before saving.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3.5 sm:p-5 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            className="text-xs h-9 px-3"
          >
            Cancel
          </Button>

          {step === 'review' && (
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleConfirmSave}
              className="gap-1.5 sm:gap-2 text-xs font-bold h-9 px-3 sm:px-4"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span className="hidden xs:inline">Confirm & Save Verified Prescription</span>
                  <span className="xs:hidden">Confirm & Save</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
