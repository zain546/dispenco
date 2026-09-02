'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Pill,
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
  Edit3,
  Layers,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScannerInput } from '@/components/ui/scanner-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
} from '../schemas/product-schema';
import { productsApi, type ProductData, type BatchData } from '../services/products-api';
import { formatCategory, formatDate, formatUnitPlural } from './product-list';
import { EditBatchModal } from './edit-batch-modal';
import { FefoBatchBreakdown } from './fefo-batch-breakdown';
import { getBatchExpiryDetails } from '../utils/batch-utils';

interface ProductFormProps {
  initialData?: ProductData;
  isEditing?: boolean;
}

export function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Batch state for existing products
  const [batches, setBatches] = useState<BatchData[]>(initialData?.batches || []);
  const [editingBatch, setEditingBatch] = useState<BatchData | null>(null);
  const [editBatchModalOpen, setEditBatchModalOpen] = useState(false);

  const handleRefreshBatches = async () => {
    if (!initialData?.id) return;
    try {
      const res: any = await productsApi.getProductById(initialData.id);
      const item = res?.data || (res?.id ? res : null);
      if (item?.batches) {
        setBatches(item.batches);
      }
    } catch (err) {
      console.error('Failed to refresh batches:', err);
    }
  };

  const handleEditBatchClick = (batch: BatchData) => {
    setEditingBatch(batch);
    setEditBatchModalOpen(true);
  };

  const initialAttrs = (initialData?.attributes || {}) as Record<string, any>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      genericName: initialData?.genericName || '',
      category: initialData?.category || 'TABLET_CAPSULE',
      unit: initialData?.unit || 'Box',
      barcode: initialData?.barcode || '',
      taxCode: initialData?.taxCode || '',
      isControlledSubstance: Boolean(initialData?.isControlledSubstance),
      lowStockThreshold: initialData?.lowStockThreshold ?? 10,

      // Initial Stock & Pricing
      initialStockQuantity: initialData?.totalStock || undefined,
      expiryDate: '',
      costPrice: initialData?.latestCostPrice ? Number(initialData.latestCostPrice) : undefined,
      sellPrice: initialData?.latestSellPrice ? Number(initialData.latestSellPrice) : undefined,

      // Batch, Location & Purchase Invoice Details
      batchNumber: '',
      rackNumber: initialAttrs.rackNumber || '',
      vendorName: initialAttrs.vendorName || '',
      mfgDate: initialAttrs.mfgDate || '',
      purchaseInvoiceNumber: initialAttrs.purchaseInvoiceNumber || '',
      purchaseInvoiceDate: initialAttrs.purchaseInvoiceDate || '',

      // Category attributes
      dosageForm: initialAttrs.dosageForm || '',
      strength: initialAttrs.strength || '',
      packSize: initialAttrs.packSize ? Number(initialAttrs.packSize) : undefined,
      manufacturer: initialAttrs.manufacturer || '',
      volumeMl: initialAttrs.volumeMl ? Number(initialAttrs.volumeMl) : undefined,
      flavor: initialAttrs.flavor || '',
      route: initialAttrs.route || '',
      storageTemp: initialAttrs.storageTemp || '',
      modelNumber: initialAttrs.modelNumber || '',
      warrantyMonths: initialAttrs.warrantyMonths ? Number(initialAttrs.warrantyMonths) : undefined,
      brand: initialAttrs.brand || '',
      description: initialAttrs.description || '',
    },
  });

  const selectedCategory = watch('category');
  const selectedUnit = watch('unit') || 'Box';
  const isControlled = watch('isControlledSubstance');

  const onSubmit = handleSubmit(async (values) => {
    setIsLoading(true);
    setError(null);

    // Build attributes payload based on category
    const attributes: Record<string, any> = {};

    if (values.manufacturer) attributes.manufacturer = values.manufacturer;
    if (values.rackNumber) attributes.rackNumber = values.rackNumber;
    if (values.vendorName) attributes.vendorName = values.vendorName;
    if (values.mfgDate) attributes.mfgDate = values.mfgDate;
    if (values.purchaseInvoiceNumber) attributes.purchaseInvoiceNumber = values.purchaseInvoiceNumber;
    if (values.purchaseInvoiceDate) attributes.purchaseInvoiceDate = values.purchaseInvoiceDate;

    if (selectedCategory === 'TABLET_CAPSULE') {
      if (values.dosageForm) attributes.dosageForm = values.dosageForm;
      if (values.strength) attributes.strength = values.strength;
      if (values.packSize) attributes.packSize = Number(values.packSize);
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
        toast.success('Medicine product updated successfully!');
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
          initialStockQuantity: values.initialStockQuantity ? Number(values.initialStockQuantity) : undefined,
          expiryDate: values.expiryDate || undefined,
          costPrice: values.costPrice ? Number(values.costPrice) : undefined,
          sellPrice: values.sellPrice ? Number(values.sellPrice) : undefined,
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to save product');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-0 sm:px-4 pb-12">
      {/* Header Bar */}
      <div className="pb-3 border-b border-border space-y-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="size-8 sm:size-9 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 min-w-0">
            <Pill className="size-5 text-primary shrink-0" />
            <span className="truncate">{isEditing ? 'Edit Medicine' : 'Create Stock & Add Medicine'}</span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground pl-10.5 sm:pl-11">
          {isEditing
            ? 'Update medicine specifications and catalog details.'
            : 'Enter medicine details, stock quantity, prices, and batch info.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
        {/* Core Medicine & Stock Information Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 leading-tight">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>{isEditing ? 'Mandatory Medicine Specifications' : 'Mandatory Medicine & Stock Fields'}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {isEditing
                ? 'Update master product title, generic formula, category, and package unit.'
                : 'Enter medicine title, stock quantity, prices, and expiry date.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Medicine / Product Name */}
            <div className="space-y-1.5 col-span-1 sm:col-span-2 md:col-span-1">
              <Label htmlFor="name" className="text-xs sm:text-sm">
                Medicine / Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Panadol Extra 500mg"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Generic Formula / Brand */}
            <div className="space-y-1.5 col-span-1 sm:col-span-2 md:col-span-1">
              <Label htmlFor="genericName" className="text-xs sm:text-sm">
                Generic Name / Brand Formula
              </Label>
              <Input
                id="genericName"
                placeholder="e.g. Paracetamol"
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
                onValueChange={(val) => setValue('unit', val, { shouldValidate: true })}
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

            {/* Only show initial stock & price fields when creating a NEW product */}
            {!isEditing && (
              <>
                {/* Initial Stock Quantity */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="initialStockQuantity" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <Boxes className="size-3.5 text-primary shrink-0" />
                    <span>Stock Quantity ({selectedUnit}s)</span>
                  </Label>
                  <Input
                    id="initialStockQuantity"
                    type="number"
                    placeholder="e.g. 50"
                    {...register('initialStockQuantity')}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Quantity measured in full <strong>{selectedUnit}s</strong>.
                  </p>
                </div>

                {/* Expiry Date */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="expiryDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary shrink-0" />
                    <span>Set Expiry Date</span>
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    {...register('expiryDate')}
                  />
                </div>

                {/* Purchase / Cost Price */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="costPrice" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Purchase Price per {selectedUnit}</span>
                  </Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150.00"
                    {...register('costPrice')}
                  />
                </div>

                {/* Retail Price / MRP */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="sellPrice" className="text-xs sm:text-sm flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-primary shrink-0" />
                    <span>Retail Price (MRP) per {selectedUnit}</span>
                  </Label>
                  <Input
                    id="sellPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 200.00"
                    {...register('sellPrice')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* When Editing an existing product: Show Consolidated FEFO Batches & Expiry Breakdown */}
        {isEditing && (
          <FefoBatchBreakdown
            productId={initialData?.id}
            batches={batches}
            selectedUnit={selectedUnit}
            onEditBatch={handleEditBatchClick}
          />
        )}

        {/* Optional Batch, Manufacturing & Vendor Invoice Details (Only shown when creating a NEW product) */}
        {!isEditing && (
          <Card className="shadow-xs">
            <CardHeader className="p-3.5 sm:p-6">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 leading-tight">
                <Boxes className="size-4 text-primary shrink-0" />
                <span>Batch, Manufacturing & Invoice Details (Optional)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Batch code, manufacturing date, vendor info, and shelf location.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Batch Number */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="batchNumber" className="text-xs sm:text-sm">Batch No</Label>
                <Input
                  id="batchNumber"
                  placeholder="e.g. BATCH-1024"
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
                  {...register('mfgDate')}
                />
              </div>

              {/* Vendor / Distributor Name */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="vendorName" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Truck className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Vendor Name / Supplier</span>
                </Label>
                <Input
                  id="vendorName"
                  placeholder="e.g. Muller & Phipps"
                  {...register('vendorName')}
                />
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
                  {...register('purchaseInvoiceDate')}
                />
              </div>

              {/* Rack Number */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="rackNumber" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Rack / Shelf Number</span>
                </Label>
                <Input
                  id="rackNumber"
                  placeholder="e.g. Rack A-3"
                  {...register('rackNumber')}
                />
              </div>

              {/* Barcode */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <Label htmlFor="barcode" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Barcode / EAN (Optional)</span>
                </Label>
                <ScannerInput
                  id="barcode"
                  placeholder="Enter Barcode or scan with camera/hardware scanner"
                  value={watch('barcode') || ''}
                  onChange={(val) => setValue('barcode', val, { shouldValidate: true, shouldDirty: true })}
                  onScan={(scannedVal) => setValue('barcode', scannedVal, { shouldValidate: true, shouldDirty: true })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Category Attributes Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 leading-tight">
              <SlidersHorizontal className="size-4 text-primary shrink-0" />
              <span>Category Specs ({PRODUCT_CATEGORIES.find(c => c.value === selectedCategory)?.label})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Pharmaceutical details specific to this category.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Manufacturer Field */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="manufacturer" className="text-xs sm:text-sm">Manufacturer / Pharma</Label>
              <Input
                id="manufacturer"
                placeholder="e.g. GSK, Abbott, Getz"
                {...register('manufacturer')}
              />
            </div>

            {/* TABLET_CAPSULE Fields */}
            {selectedCategory === 'TABLET_CAPSULE' && (
              <>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="dosageForm" className="text-xs sm:text-sm">Dosage Form</Label>
                  <Input
                    id="dosageForm"
                    placeholder="e.g. Film-Coated Tablet"
                    {...register('dosageForm')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="strength" className="text-xs sm:text-sm">Strength</Label>
                  <Input
                    id="strength"
                    placeholder="e.g. 500mg, 20mg"
                    {...register('strength')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="packSize" className="text-xs sm:text-sm">Pack Size (Units in {selectedUnit})</Label>
                  <Input
                    id="packSize"
                    type="number"
                    placeholder="e.g. 100"
                    {...register('packSize')}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enables loose tablet selling at POS counter.
                  </p>
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
                    {...register('volumeMl')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="flavor" className="text-xs sm:text-sm">Flavor (Optional)</Label>
                  <Input
                    id="flavor"
                    placeholder="e.g. Cherry, Mixed Fruit"
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
                    {...register('route')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="storageTemp" className="text-xs sm:text-sm">Storage Temp</Label>
                  <Input
                    id="storageTemp"
                    placeholder="e.g. 2°C - 8°C"
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
                    {...register('modelNumber')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="warrantyMonths" className="text-xs sm:text-sm">Warranty (Months)</Label>
                  <Input
                    id="warrantyMonths"
                    type="number"
                    placeholder="e.g. 12"
                    {...register('warrantyMonths')}
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
                    {...register('brand')}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                  <Input
                    id="description"
                    placeholder="Short product overview"
                    {...register('description')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Compliance & Low Stock Alerts Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 leading-tight">
              <ShieldAlert className="size-4 text-primary shrink-0" />
              <span>Compliance & Reorder Alerts</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Set low-stock reorder thresholds and prescription schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Low Stock Alert Threshold */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="lowStockThreshold" className="text-xs sm:text-sm">Low Stock Alert ({selectedUnit}s)</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                placeholder="10"
                {...register('lowStockThreshold')}
              />
              <p className="text-[11px] text-muted-foreground">
                Triggers alert when remaining stock falls below this amount.
              </p>
            </div>

            {/* Controlled Substance Panel */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="isControlledSubstance" className="text-xs sm:text-sm">Regulatory Classification</Label>
              <div className="flex flex-col justify-start rounded-md border border-input p-3 bg-card gap-2">
                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="isControlledSubstance"
                    checked={isControlled}
                    onCheckedChange={(checked) =>
                      setValue('isControlledSubstance', !!checked, { shouldValidate: true })
                    }
                  />
                  <Label htmlFor="isControlledSubstance" className="cursor-pointer font-medium text-xs sm:text-sm">
                    Controlled Substance / Schedule Rx
                  </Label>
                </div>
                {isControlled ? (
                  <div className="flex items-center gap-1.5 text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-sm">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    <span>Requires Doctor Prescription & Audit Log</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Regular OTC medicine. Does not require special Rx logging.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Action Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto gap-2 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving Stock...</span>
              </>
            ) : (
              <>
                <Save className="size-4" />
                <span>{isEditing ? 'Update Product' : 'Create Stock'}</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Interactive Batch Edit Modal for existing products */}
      {isEditing && (
        <EditBatchModal
          batch={editingBatch}
          unit={selectedUnit}
          open={editBatchModalOpen}
          onOpenChange={setEditBatchModalOpen}
          onBatchUpdated={handleRefreshBatches}
        />
      )}
    </div>
  );
}
