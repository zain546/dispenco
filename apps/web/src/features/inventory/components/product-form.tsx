'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  QrCode,
  SlidersHorizontal,
  Boxes,
  Calendar,
  DollarSign,
  MapPin,
  Truck,
  FileText,
  Layers,
  Info,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  productFormSchema,
  type ProductFormValues,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
} from '../schemas/product-schema';
import { productsApi, type ProductData, type BatchData } from '../services/products-api';
import { suppliersApi, type SupplierData } from '@/features/suppliers/services/suppliers-api';
import { formatUnitPlural } from './product-list';
import { getErrorMessage } from '@/lib/errors';
import {
  PosUnitBreakdown,
  ExpiryDateNotice,
  RequiredStockIndicator,
  normalizeUnit,
} from './product-form/stock-pricing-widgets';
import {
  SmartScanSubtitle,
  BarcodeScannerField,
} from './product-form/barcode-scanner-banner';
import {
  PrescriptionStatusSection,
  DosageFormField,
} from './product-form/category-details-section';
import {
  InvertedPriceDialog,
  BarcodeCollisionDialog,
} from './product-form/product-form-dialogs';
import type { Gs1ParsedMedicineData } from '@/components/ui/scanner-input';

interface ProductFormProps {
  initialData?: ProductData;
  isEditing?: boolean;
  initialBatchId?: string | null;
  initialBatchNumber?: string | null;
}

export function ProductForm({
  initialData,
  isEditing = false,
  initialBatchId = null,
  initialBatchNumber = null,
}: ProductFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [pendingSubmitValues, setPendingSubmitValues] = useState<ProductFormValues | null>(null);
  const [showInvertedPriceDialog, setShowInvertedPriceDialog] = useState(false);
  const [showBarcodeCollisionDialog, setShowBarcodeCollisionDialog] = useState(false);

  // Fetch registered suppliers for autocomplete suggestions
  useEffect(() => {
    let isMounted = true;
    suppliersApi
      .getSuppliers()
      .then((res) => {
        if (isMounted && res?.suppliers) {
          setSuppliers(res.suppliers);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Batch state for existing products
  const batches = useMemo(() => initialData?.batches || [], [initialData]);

  const formatIsoDate = (dString?: string | null) => {
    if (!dString) return '';
    try {
      return new Date(dString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const activeBatch = useMemo(() => {
    if (!batches || batches.length === 0) return null;
    if (initialBatchId) {
      const found = batches.find((b) => b.id === initialBatchId || b.batchNumber === initialBatchId);
      if (found) return found;
    }
    if (initialBatchNumber) {
      const found = batches.find((b) => b.batchNumber === initialBatchNumber);
      if (found) return found;
    }
    return batches[0] || null;
  }, [batches, initialBatchId, initialBatchNumber]);



  const initialAttrs = (initialData?.attributes || {}) as Record<string, unknown>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      isEditing: Boolean(isEditing),
      name: initialData?.name || '',
      genericName: initialData?.genericName || '',
      category: initialData?.category || 'TABLET_CAPSULE',
      unit: normalizeUnit(initialData?.unit),
      barcode: initialData?.barcode || '',
      taxCode: initialData?.taxCode || '',
      isControlledSubstance: Boolean(initialData?.isControlledSubstance),
      lowStockThreshold: initialData?.lowStockThreshold ?? 10,

      // Initial Stock & Pricing
      initialStockQuantity: initialData?.totalStock !== undefined ? initialData.totalStock : undefined,
      expiryDate: '',
      costPrice: initialData?.latestCostPrice !== undefined && initialData.latestCostPrice !== null ? Number(initialData.latestCostPrice) : undefined,
      sellPrice: initialData?.latestSellPrice !== undefined && initialData.latestSellPrice !== null ? Number(initialData.latestSellPrice) : undefined,

      // Batch, Location & Purchase Invoice Details
      batchNumber: '',
      rackNumber: initialAttrs.rackNumber ? String(initialAttrs.rackNumber) : '',
      vendorName: initialAttrs.vendorName ? String(initialAttrs.vendorName) : '',
      mfgDate: initialAttrs.mfgDate ? String(initialAttrs.mfgDate) : '',
      purchaseInvoiceNumber: initialAttrs.purchaseInvoiceNumber ? String(initialAttrs.purchaseInvoiceNumber) : '',
      purchaseInvoiceDate: initialAttrs.purchaseInvoiceDate ? String(initialAttrs.purchaseInvoiceDate) : '',

      // Category attributes
      dosageForm: initialAttrs.dosageForm ? String(initialAttrs.dosageForm) : '',
      strength: initialAttrs.strength ? String(initialAttrs.strength) : '',
      packSize: initialAttrs.packSize ? Number(initialAttrs.packSize) : undefined,
      manufacturer: initialAttrs.manufacturer ? String(initialAttrs.manufacturer) : '',
      volumeMl: initialAttrs.volumeMl ? Number(initialAttrs.volumeMl) : undefined,
      flavor: initialAttrs.flavor ? String(initialAttrs.flavor) : '',
      route: initialAttrs.route ? String(initialAttrs.route) : '',
      storageTemp: initialAttrs.storageTemp ? String(initialAttrs.storageTemp) : '',
      modelNumber: initialAttrs.modelNumber ? String(initialAttrs.modelNumber) : '',
      warrantyMonths: initialAttrs.warrantyMonths ? Number(initialAttrs.warrantyMonths) : undefined,
      weightGrams: initialAttrs.weightGrams ? Number(initialAttrs.weightGrams) : undefined,
      skinType: initialAttrs.skinType ? String(initialAttrs.skinType) : '',
      brand: initialAttrs.brand ? String(initialAttrs.brand) : '',
      description: initialAttrs.description ? String(initialAttrs.description) : '',
    },
  });

  const populateBatchValues = useCallback(
    (batch: BatchData | null) => {
      if (!batch) return;
      setValue('batchNumber', batch.batchNumber || '', { shouldDirty: false });
      setValue('initialStockQuantity', batch.quantityRemaining ?? 0, { shouldDirty: false });
      if (batch.costPrice !== undefined && batch.costPrice !== null) {
        setValue('costPrice', Number(batch.costPrice), { shouldDirty: false });
      }
      if (batch.sellPrice !== undefined && batch.sellPrice !== null) {
        setValue('sellPrice', Number(batch.sellPrice), { shouldDirty: false });
      }
      setValue('expiryDate', formatIsoDate(batch.expiryDate), { shouldDirty: false });
      setValue('mfgDate', formatIsoDate(batch.mfgDate), { shouldDirty: false });
      if (batch.rackNumber) setValue('rackNumber', batch.rackNumber, { shouldDirty: false });
      if (batch.vendorName) setValue('vendorName', batch.vendorName, { shouldDirty: false });
      if (batch.purchaseInvoiceNumber) setValue('purchaseInvoiceNumber', batch.purchaseInvoiceNumber, { shouldDirty: false });
      if (batch.purchaseInvoiceDate) setValue('purchaseInvoiceDate', formatIsoDate(batch.purchaseInvoiceDate), { shouldDirty: false });
    },
    [setValue]
  );

  useEffect(() => {
    if (isEditing && activeBatch) {
      populateBatchValues(activeBatch);
    }
  }, [isEditing, activeBatch, populateBatchValues]);

  // Auto-dismiss stale server error alert as soon as the user edits any field
  useEffect(() => {
    if (!error) return;
    const subscription = watch(() => {
      setError(null);
    });
    return () => subscription.unsubscribe();
  }, [watch, error]);

  const selectedCategory = watch('category');
  const selectedUnit = normalizeUnit(watch('unit'));
  const isMultiUnitPackage = ['box', 'strip', 'kit', 'pack'].includes(selectedUnit.toLowerCase());
  const [scannedExistingProduct, setScannedExistingProduct] = useState<ProductData | null>(null);

  const handleSmartBoxScan = useCallback(
    async (scannedCode: string, parsedData?: Gs1ParsedMedicineData) => {
      const cleanCode = scannedCode.trim();
      if (!cleanCode) return;

      setValue('barcode', cleanCode, { shouldValidate: true, shouldDirty: true });

      const extractedFields: string[] = [`GTIN: ${cleanCode}`];
      if (parsedData?.batchNumber) {
        setValue('batchNumber', parsedData.batchNumber, { shouldValidate: true, shouldDirty: true });
        extractedFields.push(`Batch: ${parsedData.batchNumber}`);
      }
      if (parsedData?.expiryDate) {
        setValue('expiryDate', parsedData.expiryDate, { shouldValidate: true, shouldDirty: true });
        extractedFields.push(`Exp: ${parsedData.expiryDate}`);
      }
      if (parsedData?.mfgDate) {
        setValue('mfgDate', parsedData.mfgDate, { shouldValidate: true, shouldDirty: true });
        extractedFields.push(`Mfg: ${parsedData.mfgDate}`);
      }
      if (parsedData?.mrp && parsedData.mrp > 0) {
        setValue('sellPrice', parsedData.mrp, { shouldValidate: true, shouldDirty: true });
        extractedFields.push(`MRP: ${parsedData.mrp}`);
      }

      toast.success(`Scanned Box (${extractedFields.join(' • ')})`);

      // Check if this barcode already exists in catalog to auto-fill medicine details
      if (!isEditing) {
        try {
          const res = await productsApi.lookupByBarcode(cleanCode);
          if (res?.product) {
            const p = res.product;
            setScannedExistingProduct(p);
            if (!getValues('name')) setValue('name', p.name, { shouldValidate: true });
            if (p.genericName && !getValues('genericName')) setValue('genericName', p.genericName);
            if (p.category) setValue('category', p.category);
            if (p.unit) setValue('unit', normalizeUnit(p.unit));
            if (p.latestCostPrice) setValue('costPrice', Number(p.latestCostPrice));
            if (p.latestSellPrice && !parsedData?.mrp) setValue('sellPrice', Number(p.latestSellPrice));
            const attrs = (p.attributes || {}) as Record<string, unknown>;
            if (attrs.rackNumber) setValue('rackNumber', String(attrs.rackNumber));
            if (attrs.packSize) setValue('packSize', Number(attrs.packSize));
            if (attrs.manufacturer) setValue('manufacturer', String(attrs.manufacturer));
            toast.info(`Found existing medicine "${p.name}" — details pre-filled!`);
          } else {
            setScannedExistingProduct(null);
          }
        } catch {
          setScannedExistingProduct(null);
        }
      }
    },
    [isEditing, setValue, getValues]
  );

  const handleNavigateToReceiveBatch = useCallback(() => {
    if (!scannedExistingProduct) return;
    const params = new URLSearchParams();
    params.set('productId', scannedExistingProduct.id);
    if (getValues('batchNumber')) params.set('batchNumber', String(getValues('batchNumber')));
    if (getValues('expiryDate')) params.set('expiryDate', String(getValues('expiryDate')));
    if (getValues('mfgDate')) params.set('mfgDate', String(getValues('mfgDate')));
    router.push(`/inventory/receive?${params.toString()}`);
  }, [scannedExistingProduct, getValues, router]);

  // Sequence counter and timer ref to prevent race conditions & debounce manual barcode typing
  const barcodeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeLookupSeqRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (barcodeDebounceTimerRef.current) {
        clearTimeout(barcodeDebounceTimerRef.current);
      }
    };
  }, []);

  const handleBarcodeChange = useCallback(
    (val: string) => {
      setValue('barcode', val, { shouldValidate: true, shouldDirty: true });
      const clean = val.trim();

      if (barcodeDebounceTimerRef.current) {
        clearTimeout(barcodeDebounceTimerRef.current);
      }

      if (!clean || isEditing) {
        setScannedExistingProduct(null);
        return;
      }

      // Debounce barcode lookups by 300ms to avoid flooding requests on fast typing/paste
      const seq = ++barcodeLookupSeqRef.current;
      barcodeDebounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await productsApi.lookupByBarcode(clean);
          if (seq === barcodeLookupSeqRef.current) {
            if (res?.product) {
              setScannedExistingProduct(res.product);
            } else {
              setScannedExistingProduct(null);
            }
          }
        } catch {
          if (seq === barcodeLookupSeqRef.current) {
            setScannedExistingProduct(null);
          }
        }
      }, 300);
    },
    [isEditing, setValue]
  );

  // Pre-fill from URL query parameters (e.g. navigated from POS "Add New Medicine from Scan")
  useEffect(() => {
    if (isEditing) return;
    const qBarcode = searchParams.get('barcode');
    const qBatch = searchParams.get('batchNumber');
    const qExpiry = searchParams.get('expiryDate');
    const qMfg = searchParams.get('mfgDate');
    const qName = searchParams.get('name');

    if (qBarcode) {
      handleBarcodeChange(qBarcode);
    }
    if (qBatch) setValue('batchNumber', qBatch, { shouldDirty: true });
    if (qExpiry) setValue('expiryDate', qExpiry, { shouldDirty: true });
    if (qMfg) setValue('mfgDate', qMfg, { shouldDirty: true });
    if (qName) setValue('name', qName, { shouldDirty: true });
  }, [isEditing, searchParams, setValue, handleBarcodeChange]);

  const preventNegativeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  const today = useMemo(() => new Date(), []);
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const executeSubmit = async (values: ProductFormValues) => {
    setError(null);
    setIsLoading(true);

    // Build attributes payload based on category with strong typing
    const attributes: Record<string, unknown> = {};

    if (values.manufacturer) attributes.manufacturer = values.manufacturer;
    if (values.rackNumber) attributes.rackNumber = values.rackNumber;
    if (values.vendorName) attributes.vendorName = values.vendorName;
    if (values.mfgDate) attributes.mfgDate = values.mfgDate;
    if (values.purchaseInvoiceNumber) attributes.purchaseInvoiceNumber = values.purchaseInvoiceNumber;
    if (values.purchaseInvoiceDate) attributes.purchaseInvoiceDate = values.purchaseInvoiceDate;
    if (isMultiUnitPackage && values.packSize) {
      attributes.packSize = Number(values.packSize);
    } else {
      attributes.packSize = 1;
    }

    if (selectedCategory === 'TABLET_CAPSULE') {
      if (values.dosageForm) attributes.dosageForm = values.dosageForm;
      if (values.strength) attributes.strength = values.strength;
    } else if (selectedCategory === 'SYRUP_LIQUID') {
      if (values.volumeMl) attributes.volumeMl = Number(values.volumeMl);
      if (values.flavor) attributes.flavor = values.flavor;
      if (values.strength) attributes.strength = values.strength;
    } else if (selectedCategory === 'INJECTION_INFUSION') {
      if (values.volumeMl) attributes.volumeMl = Number(values.volumeMl);
      if (values.route) attributes.route = values.route;
      if (values.storageTemp) attributes.storageTemp = values.storageTemp;
    } else if (selectedCategory === 'MEDICAL_DEVICE') {
      if (values.modelNumber) attributes.modelNumber = values.modelNumber;
      if (values.warrantyMonths) attributes.warrantyMonths = Number(values.warrantyMonths);
    } else if (selectedCategory === 'COSMETICS_PERSONAL_CARE') {
      if (values.volumeMl) attributes.volumeMl = Number(values.volumeMl);
      if (values.weightGrams) attributes.weightGrams = Number(values.weightGrams);
      if (values.skinType) attributes.skinType = values.skinType;
    } else if (selectedCategory === 'GENERAL_ITEM') {
      if (values.brand) attributes.brand = values.brand;
      if (values.description) attributes.description = values.description;
    }

    try {
      if (isEditing && initialData) {
        await productsApi.updateProduct(initialData.id, {
          name: values.name,
          genericName: values.genericName || undefined,
          category: values.category,
          unit: values.unit,
          barcode: values.barcode || undefined,
          taxCode: values.taxCode || undefined,
          isControlledSubstance: values.isControlledSubstance,
          lowStockThreshold: Number(values.lowStockThreshold),
          attributes,
        });

        if (activeBatch?.id) {
          await productsApi.updateBatch(activeBatch.id, {
            batchNumber: values.batchNumber?.trim() || activeBatch.batchNumber,
            expiryDate: values.expiryDate || activeBatch.expiryDate,
            mfgDate: values.mfgDate || undefined,
            quantityRemaining: values.initialStockQuantity !== undefined ? Number(values.initialStockQuantity) : undefined,
            costPrice: values.costPrice !== undefined ? Number(values.costPrice) : undefined,
            sellPrice: values.sellPrice !== undefined ? Number(values.sellPrice) : undefined,
            rackNumber: values.rackNumber?.trim() || undefined,
            vendorName: values.vendorName?.trim() || undefined,
            purchaseInvoiceNumber: values.purchaseInvoiceNumber?.trim() || undefined,
            purchaseInvoiceDate: values.purchaseInvoiceDate || undefined,
          });
        }

        toast.success(
          activeBatch
            ? `Updated ${values.name} and Batch #${values.batchNumber || activeBatch.batchNumber}!`
            : 'Medicine product updated successfully!'
        );
      } else {
        await productsApi.createProduct({
          name: values.name,
          genericName: values.genericName || undefined,
          category: values.category,
          unit: values.unit,
          barcode: values.barcode || undefined,
          taxCode: values.taxCode || undefined,
          isControlledSubstance: values.isControlledSubstance,
          lowStockThreshold: Number(values.lowStockThreshold),

          // Stock & Batch payload
          initialStockQuantity: values.initialStockQuantity !== undefined ? Number(values.initialStockQuantity) : undefined,
          expiryDate: values.expiryDate || undefined,
          costPrice: values.costPrice !== undefined ? Number(values.costPrice) : undefined,
          sellPrice: values.sellPrice !== undefined ? Number(values.sellPrice) : undefined,
          batchNumber: values.batchNumber || undefined,
          rackNumber: values.rackNumber || undefined,
          vendorName: values.vendorName || undefined,
          mfgDate: values.mfgDate || undefined,
          purchaseInvoiceNumber: values.purchaseInvoiceNumber || undefined,
          purchaseInvoiceDate: values.purchaseInvoiceDate || undefined,
          attributes,
        });
        toast.success('Stock & Medicine created successfully!');
      }

      router.push('/inventory');
      router.refresh();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to save product');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);

      // Barcode Collision Guard: Prevent duplicate product creation conflict
      if (!isEditing && scannedExistingProduct) {
        setShowBarcodeCollisionDialog(true);
        return;
      }

      const cost = values.costPrice !== undefined ? Number(values.costPrice) : 0;
      const sell = values.sellPrice !== undefined ? Number(values.sellPrice) : 0;

      if (cost > 0 && sell > 0 && cost > sell) {
        setPendingSubmitValues(values as ProductFormValues);
        setShowInvertedPriceDialog(true);
        return;
      }

      await executeSubmit(values as ProductFormValues);
    },
    (formErrors) => {
      setError(null);
      const firstError = Object.values(formErrors)[0]?.message;
      if (firstError) {
        toast.error(String(firstError));
      }
    }
  );

  const handleConfirmInvertedPricing = async () => {
    if (!pendingSubmitValues) return;
    const valuesToSubmit = pendingSubmitValues;
    setShowInvertedPriceDialog(false);
    await executeSubmit(valuesToSubmit);
    setPendingSubmitValues(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-0 sm:px-4 pb-28 sm:pb-12">
      {/* Header Bar */}
      <div className="pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="size-8 sm:size-9 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-normal text-foreground truncate">
              {isEditing
                ? activeBatch
                  ? `Edit (${activeBatch.batchNumber})`
                  : 'Edit Medicine'
                : 'Add Stock'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter medicine details, stock, prices, and batch info.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <AlertDescription className="text-xs sm:text-sm break-words">{error}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setError(null)}
            className="size-6 -mr-1.5 -mt-1 text-destructive hover:bg-destructive/15 shrink-0"
            title="Dismiss error"
          >
            <X className="size-3.5" />
          </Button>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
        {/* Clean, Single-Row Smart Scan Bar */}
        {!isEditing && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 sm:px-4 sm:py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <QrCode className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    Scan Medicine Box
                  </p>
                  <SmartScanSubtitle control={control} />
                </div>
              </div>

              <BarcodeScannerField
                id="quick-box-scanner"
                control={control}
                buttonOnly
                buttonLabel="Scan Box"
                onChange={handleBarcodeChange}
                onScan={(scannedVal, parsedData) => handleSmartBoxScan(scannedVal, parsedData)}
              />
            </div>

            {scannedExistingProduct && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <Boxes className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      Medicine already in catalog: <span className="text-primary font-bold">{scannedExistingProduct.name}</span>
                    </p>
                    <p className="text-micro text-muted-foreground">
                      Barcode {scannedExistingProduct.barcode || getValues('barcode')} is already registered. Switch to receive a new stock batch.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleNavigateToReceiveBatch}
                  className="h-8 px-3 text-xs font-semibold shrink-0 gap-1.5 w-full sm:w-auto shadow-xs"
                >
                  <Boxes className="size-3.5" />
                  <span>Receive Batch Instead</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Core Medicine & Stock Information Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 sm:p-5">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>Medicine & Stock Details</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Basic medicine info, stock, and pricing.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Medicine / Product Name */}
            <div className="space-y-1.5 col-span-1 sm:col-span-2 md:col-span-1">
              <Label htmlFor="name" className="text-xs sm:text-sm">
                Medicine Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Panadol Extra 500mg"
                autoComplete="off"
                spellCheck={false}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Generic Formula / Brand */}
            <div className="space-y-1.5 col-span-1 sm:col-span-2 md:col-span-1">
              <Label htmlFor="genericName" className="text-xs sm:text-sm">
                Generic Formula
              </Label>
              <Input
                id="genericName"
                placeholder="e.g. Paracetamol"
                autoComplete="off"
                spellCheck={false}
                {...register('genericName')}
              />
            </div>

            {/* Package Unit */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="unit" className="text-xs sm:text-sm">
                Package Unit <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedUnit}
                onValueChange={(val) => setValue('unit', normalizeUnit(val), { shouldValidate: true })}
              >
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-xs text-destructive">{errors.unit.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="category" className="text-xs sm:text-sm">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setValue('category', val, { shouldValidate: true })}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            {/* Stock & Pricing Fields */}
            <>
                {/* Initial Stock Quantity */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="initialStockQuantity" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <Boxes className="size-3.5 text-primary shrink-0" />
                    <span>Stock Quantity ({formatUnitPlural(selectedUnit)})</span>
                  </Label>
                  <Input
                    id="initialStockQuantity"
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    onKeyDown={preventNegativeKeyDown}
                    autoComplete="off"
                    {...register('initialStockQuantity')}
                  />
                  {errors.initialStockQuantity && (
                    <p className="text-xs text-destructive">{errors.initialStockQuantity.message}</p>
                  )}
                  <p className="text-micro text-muted-foreground">
                    Quantity measured in full <strong>{formatUnitPlural(selectedUnit)}</strong>.
                  </p>
                </div>

                {/* Pack Size (Units per Box/Strip/Kit) - only shown for container units */}
                {isMultiUnitPackage && (
                  <div className="space-y-1.5 col-span-1">
                    <Label htmlFor="packSize" className="text-xs sm:text-sm flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary shrink-0" />
                      <span>Pack Size (Units per {selectedUnit})</span>
                    </Label>
                    <Input
                      id="packSize"
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      onKeyDown={preventNegativeKeyDown}
                      autoComplete="off"
                      {...register('packSize')}
                    />
                    {errors.packSize && (
                      <p className="text-xs text-destructive">{errors.packSize.message}</p>
                    )}
                    <p className="text-micro text-muted-foreground">
                      Sub-units per {selectedUnit}.
                    </p>
                  </div>
                )}

                {/* Expiry Date */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="expiryDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary shrink-0" />
                    <span>Expiry Date</span>
                    <RequiredStockIndicator control={control} />
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    min={!isEditing ? todayString : undefined}
                    autoComplete="off"
                    {...register('expiryDate')}
                  />
                  {errors.expiryDate && (
                    <p className="text-xs text-destructive font-medium">{errors.expiryDate.message}</p>
                  )}
                  <ExpiryDateNotice control={control} />
                </div>

                {/* Purchase / Cost Price */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="costPrice" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Purchase Price ({selectedUnit})</span>
                    <RequiredStockIndicator control={control} />
                  </Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 150.00"
                    onKeyDown={preventNegativeKeyDown}
                    autoComplete="off"
                    {...register('costPrice')}
                  />
                  {errors.costPrice && (
                    <p className="text-xs text-destructive">{errors.costPrice.message}</p>
                  )}
                </div>

                {/* Retail Price / MRP */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="sellPrice" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-primary shrink-0" />
                    <span>Retail Price (MRP)</span>
                    <RequiredStockIndicator control={control} />
                  </Label>
                  <Input
                    id="sellPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 200.00"
                    onKeyDown={preventNegativeKeyDown}
                    autoComplete="off"
                    {...register('sellPrice')}
                  />
                  {errors.sellPrice && (
                    <p className="text-xs text-destructive">{errors.sellPrice.message}</p>
                  )}
                </div>

                {/* Retail POS Unit Conversion Breakdown Preview */}
                <PosUnitBreakdown control={control} />
              </>
          </CardContent>
        </Card>

        

        {/* Batch, Manufacturing & Vendor Invoice Details */}
        <Card className="shadow-xs">
            <CardHeader className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Boxes className="size-4 text-primary shrink-0" />
                  <span>Batch & Invoice Details</span>
                </CardTitle>
                <Badge variant="secondary" className="text-micro font-medium shrink-0">
                  Optional
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Batch number, dates, supplier, and shelf location.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-5 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Batch Number */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="batchNumber" className="text-xs sm:text-sm">Batch No</Label>
                <Input
                  id="batchNumber"
                  placeholder="e.g. BATCH-1024"
                  autoComplete="off"
                  spellCheck={false}
                  {...register('batchNumber')}
                />
              </div>

              {/* Manufacturing Date */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="mfgDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Manufacturing Date</span>
                </Label>
                <Input
                  id="mfgDate"
                  type="date"
                  autoComplete="off"
                  {...register('mfgDate')}
                />
              </div>

              {/* Vendor / Distributor Name with Autocomplete */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="vendorName" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Truck className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Vendor / Supplier</span>
                </Label>
                <Input
                  id="vendorName"
                  list="supplier-suggestions"
                  placeholder="e.g. Muller & Phipps"
                  autoComplete="off"
                  spellCheck={false}
                  {...register('vendorName')}
                />
                <datalist id="supplier-suggestions">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              {/* Purchase Invoice Number */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="purchaseInvoiceNumber" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <FileText className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Invoice Number</span>
                </Label>
                <Input
                  id="purchaseInvoiceNumber"
                  placeholder="e.g. INV-2026-981"
                  autoComplete="off"
                  spellCheck={false}
                  {...register('purchaseInvoiceNumber')}
                />
              </div>

              {/* Purchase Invoice Date */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="purchaseInvoiceDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Invoice Date</span>
                </Label>
                <Input
                  id="purchaseInvoiceDate"
                  type="date"
                  autoComplete="off"
                  {...register('purchaseInvoiceDate')}
                />
              </div>

              {/* Rack Number */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="rackNumber" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Rack / Shelf</span>
                </Label>
                <Input
                  id="rackNumber"
                  placeholder="e.g. Rack A-3"
                  autoComplete="off"
                  spellCheck={false}
                  {...register('rackNumber')}
                />
              </div>

              {/* Barcode */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <Label htmlFor="barcode" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Barcode / EAN</span>
                </Label>
                <BarcodeScannerField
                  id="barcode"
                  placeholder="Scan or enter barcode (e.g. 08964001422082)"
                  control={control}
                  onChange={handleBarcodeChange}
                  onScan={(scannedVal, parsedData) => handleSmartBoxScan(scannedVal, parsedData)}
                />
                {scannedExistingProduct && !isEditing && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in mt-1.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-foreground">
                          Barcode already belongs to <span className="text-amber-500 font-bold">{scannedExistingProduct.name}</span>
                        </p>
                        <p className="text-micro text-muted-foreground">
                          Duplicate barcodes are not allowed. Switch to receive a new stock batch for this medicine.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={handleNavigateToReceiveBatch}
                      className="h-8 px-3 text-xs font-semibold gap-1.5 shrink-0 w-full sm:w-auto shadow-xs"
                    >
                      <Boxes className="size-3.5" />
                      <span>Receive Batch</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
        </Card>

        {/* Dynamic Category Attributes Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary shrink-0" />
                <span>Category Details</span>
              </CardTitle>
              <Badge variant="secondary" className="text-micro font-medium shrink-0">
                {PRODUCT_CATEGORIES.find(c => c.value === selectedCategory)?.label || 'Specs'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Specifications for this medicine type.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Manufacturer Field */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="manufacturer" className="text-xs sm:text-sm">Manufacturer</Label>
              <Input
                id="manufacturer"
                placeholder="e.g. GSK, Abbott, Getz"
                autoComplete="off"
                spellCheck={false}
                {...register('manufacturer')}
              />
            </div>

            {/* TABLET_CAPSULE Fields */}
            {selectedCategory === 'TABLET_CAPSULE' && (
              <>
                <DosageFormField
                  control={control}
                  register={register}
                  setValue={setValue}
                />
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="strength" className="text-xs sm:text-sm">Strength</Label>
                  <Input
                    id="strength"
                    placeholder="e.g. 500mg, 20mg"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('strength')}
                  />
                </div>
              </>
            )}

            {/* SYRUP_LIQUID Fields */}
            {selectedCategory === 'SYRUP_LIQUID' && (
              <>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="volumeMl" className="text-xs sm:text-sm">Volume (ML)</Label>
                  <Input
                    id="volumeMl"
                    type="number"
                    placeholder="e.g. 120"
                    autoComplete="off"
                    {...register('volumeMl')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="flavor" className="text-xs sm:text-sm">Flavor (Optional)</Label>
                  <Input
                    id="flavor"
                    placeholder="e.g. Cherry, Mixed Fruit"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('flavor')}
                  />
                </div>
              </>
            )}

            {/* INJECTION_INFUSION Fields */}
            {selectedCategory === 'INJECTION_INFUSION' && (
              <>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="route" className="text-xs sm:text-sm">Administration Route</Label>
                  <Input
                    id="route"
                    placeholder="e.g. IV / IM"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('route')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="storageTemp" className="text-xs sm:text-sm">Storage Temp</Label>
                  <Input
                    id="storageTemp"
                    placeholder="e.g. 2°C - 8°C"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('storageTemp')}
                  />
                </div>
              </>
            )}

            {/* MEDICAL_DEVICE Fields */}
            {selectedCategory === 'MEDICAL_DEVICE' && (
              <>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="modelNumber" className="text-xs sm:text-sm">Model Number</Label>
                  <Input
                    id="modelNumber"
                    placeholder="e.g. BP-301"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('modelNumber')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="warrantyMonths" className="text-xs sm:text-sm">Warranty (Months)</Label>
                  <Input
                    id="warrantyMonths"
                    type="number"
                    placeholder="e.g. 12"
                    autoComplete="off"
                    {...register('warrantyMonths')}
                  />
                </div>
              </>
            )}

            {/* COSMETICS_PERSONAL_CARE Fields */}
            {selectedCategory === 'COSMETICS_PERSONAL_CARE' && (
              <>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="volumeMl" className="text-xs sm:text-sm">Volume (ml)</Label>
                  <Input
                    id="volumeMl"
                    type="number"
                    placeholder="e.g. 100, 250"
                    autoComplete="off"
                    {...register('volumeMl')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="weightGrams" className="text-xs sm:text-sm">Weight (g)</Label>
                  <Input
                    id="weightGrams"
                    type="number"
                    placeholder="e.g. 50, 100"
                    autoComplete="off"
                    {...register('weightGrams')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="skinType" className="text-xs sm:text-sm">Skin Type / Application</Label>
                  <Input
                    id="skinType"
                    placeholder="e.g. All Skin Types, Oily, Sensitive"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('skinType')}
                  />
                </div>
              </>
            )}

            {/* GENERAL_ITEM Fields */}
            {selectedCategory === 'GENERAL_ITEM' && (
              <>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="brand" className="text-xs sm:text-sm">Brand Name</Label>
                  <Input
                    id="brand"
                    placeholder="e.g. Dettol, Nestlé"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('brand')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                  <Input
                    id="description"
                    placeholder="Short product overview"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('description')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Compliance & Low Stock Alerts Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 sm:p-5">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary shrink-0" />
              <span>Stock & Compliance Alerts</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Low-stock reorder alert and prescription rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Low Stock Alert Threshold */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="lowStockThreshold" className="text-xs sm:text-sm">Low Stock Alert ({formatUnitPlural(selectedUnit)})</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                placeholder="10"
                onKeyDown={preventNegativeKeyDown}
                autoComplete="off"
                {...register('lowStockThreshold')}
              />
              {errors.lowStockThreshold && (
                <p className="text-xs text-destructive">{errors.lowStockThreshold.message}</p>
              )}
              <p className="text-micro text-muted-foreground">
                Alert when stock falls below this level.
              </p>
            </div>

            {/* Controlled Substance Panel */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="isControlledSubstance" className="text-xs sm:text-sm">Prescription Status</Label>
              <PrescriptionStatusSection control={control} setValue={setValue} />
            </div>
          </CardContent>
        </Card>

        {/* Sticky Mobile & Desktop Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border px-4 py-2.5 sm:static sm:z-auto sm:bg-transparent sm:backdrop-blur-none sm:border-t sm:px-0 sm:py-0 sm:pt-4">
          <div className="max-w-4xl mx-auto flex items-center justify-end gap-2.5 sm:gap-3">
            {/* Mobile Error Summary Indicator (floated to the left when errors exist) */}
            {Object.keys(errors).length > 0 && (
              <div className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md animate-in fade-in">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>
                  {Object.keys(errors).length} {Object.keys(errors).length === 1 ? 'error' : 'errors'}
                </span>
              </div>
            )}

            {/* Paired Actions Grouped on the Right */}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-medium"
            >
              Cancel
            </Button>

            {scannedExistingProduct && !isEditing ? (
              <Button
                type="button"
                onClick={handleNavigateToReceiveBatch}
                disabled={isLoading}
                className="h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold gap-2 shadow-xs shrink-0"
              >
                <Boxes className="size-4" />
                <span>Receive Batch Instead</span>
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold gap-2 shadow-xs shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>{isEditing ? 'Update Medicine' : 'Add Stock'}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Inverted Pricing Confirmation Modal */}
      <InvertedPriceDialog
        open={showInvertedPriceDialog}
        onOpenChange={(open) => {
          setShowInvertedPriceDialog(open);
          if (!open) setPendingSubmitValues(null);
        }}
        pendingValues={pendingSubmitValues}
        isLoading={isLoading}
        onConfirm={handleConfirmInvertedPricing}
      />

      {/* Barcode Collision Confirmation Modal */}
      <BarcodeCollisionDialog
        open={showBarcodeCollisionDialog}
        onOpenChange={setShowBarcodeCollisionDialog}
        scannedProduct={scannedExistingProduct}
        barcodeValue={getValues('barcode')}
        isLoading={isLoading}
        onClearBarcode={() => {
          setValue('barcode', '', { shouldDirty: true });
          setScannedExistingProduct(null);
        }}
        onReceiveBatch={() => {
          setShowBarcodeCollisionDialog(false);
          handleNavigateToReceiveBatch();
        }}
      />

    </div>
  );
}
