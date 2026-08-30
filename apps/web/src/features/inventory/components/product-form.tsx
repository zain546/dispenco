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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
import { productsApi, type ProductData } from '../services/products-api';

interface ProductFormProps {
  initialData?: ProductData;
  isEditing?: boolean;
}

export function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="size-9 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Pill className="size-5 text-primary shrink-0" />
              <span>{isEditing ? 'Edit Medicine / Product' : 'Create Stock & Add Medicine'}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? 'Update medicine specifications and catalog details'
                : 'Enter medicine details, initial stock quantity, prices, and batch information in one click'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Core Medicine & Stock Information Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>Mandatory Medicine & Stock Fields</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Enter medicine title, stock quantity, prices, and expiry date.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Medicine / Product Name */}
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-1">
              <Label htmlFor="name" className="text-xs sm:text-sm">
                Medicine / Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter Medicine Name (e.g. Panadol Extra)"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Generic Formula / Brand */}
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-1">
              <Label htmlFor="genericName" className="text-xs sm:text-sm">
                Generic Name / Brand Formula
              </Label>
              <Input
                id="genericName"
                placeholder="Enter Generic Composition (e.g. Paracetamol)"
                {...register('genericName')}
              />
            </div>

            {/* Package Unit */}
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-xs sm:text-sm">
                Package Unit <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedUnit}
                onValueChange={(val) => setValue('unit', val, { shouldValidate: true })}
              >
                <SelectTrigger id="unit">
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
            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs sm:text-sm">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setValue('category', val, { shouldValidate: true })}
              >
                <SelectTrigger id="category">
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

            {/* Initial Stock Quantity */}
            <div className="space-y-2">
              <Label htmlFor="initialStockQuantity" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Boxes className="size-3.5 text-primary" />
                <span>Stock Quantity (in {selectedUnit}s)</span>
              </Label>
              <Input
                id="initialStockQuantity"
                type="number"
                placeholder={`Enter Stock Quantity in ${selectedUnit}s (e.g. 50)`}
                {...register('initialStockQuantity')}
              />
              <p className="text-[11px] text-muted-foreground">
                Quantity measured in full <strong>{selectedUnit}s</strong>.
              </p>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Set Expiry Date</span>
              </Label>
              <Input
                id="expiryDate"
                type="date"
                {...register('expiryDate')}
              />
            </div>

            {/* Purchase / Cost Price */}
            <div className="space-y-2">
              <Label htmlFor="costPrice" className="text-xs sm:text-sm flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-muted-foreground" />
                <span>Purchase Price per {selectedUnit}</span>
              </Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                placeholder={`Purchase price per ${selectedUnit}`}
                {...register('costPrice')}
              />
            </div>

            {/* Retail Price / MRP */}
            <div className="space-y-2">
              <Label htmlFor="sellPrice" className="text-xs sm:text-sm flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-primary" />
                <span>Retail Price (MRP) per {selectedUnit}</span>
              </Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                placeholder={`Retail price per ${selectedUnit}`}
                {...register('sellPrice')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Optional Batch, Manufacturing & Vendor Invoice Details */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              <span>Batch, Manufacturing & Invoice Details (Optional)</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Optional batch code, manufacturing date, vendor info, invoice data, and shelf location.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch Number */}
            <div className="space-y-2">
              <Label htmlFor="batchNumber" className="text-xs sm:text-sm">Batch No</Label>
              <Input
                id="batchNumber"
                placeholder="Enter Batch No (Auto-generated if empty)"
                {...register('batchNumber')}
              />
            </div>

            {/* Manufacturing Date */}
            <div className="space-y-2">
              <Label htmlFor="mfgDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>Manufacturing Date</span>
              </Label>
              <Input
                id="mfgDate"
                type="date"
                {...register('mfgDate')}
              />
            </div>

            {/* Vendor / Distributor Name */}
            <div className="space-y-2">
              <Label htmlFor="vendorName" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Truck className="size-3.5 text-muted-foreground" />
                <span>Vendor Name / Supplier</span>
              </Label>
              <Input
                id="vendorName"
                placeholder="Enter Wholesaler / Distributor (e.g. Muller & Phipps)"
                {...register('vendorName')}
              />
            </div>

            {/* Purchase Invoice Number */}
            <div className="space-y-2">
              <Label htmlFor="purchaseInvoiceNumber" className="text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                <span>Purchase Invoice Number</span>
              </Label>
              <Input
                id="purchaseInvoiceNumber"
                placeholder="Enter Invoice No (e.g. INV-2026-981)"
                {...register('purchaseInvoiceNumber')}
              />
            </div>

            {/* Purchase Invoice Date */}
            <div className="space-y-2">
              <Label htmlFor="purchaseInvoiceDate" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>Purchase Invoice Date</span>
              </Label>
              <Input
                id="purchaseInvoiceDate"
                type="date"
                {...register('purchaseInvoiceDate')}
              />
            </div>

            {/* Rack Number */}
            <div className="space-y-2">
              <Label htmlFor="rackNumber" className="text-xs sm:text-sm flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span>Rack / Shelf Number</span>
              </Label>
              <Input
                id="rackNumber"
                placeholder="Enter Rack Number (e.g. Rack A-3)"
                {...register('rackNumber')}
              />
            </div>

            {/* Barcode */}
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label htmlFor="barcode" className="text-xs sm:text-sm flex items-center gap-1.5">
                <QrCode className="size-3.5 text-muted-foreground" />
                <span>Barcode / EAN (Optional)</span>
              </Label>
              <Input
                id="barcode"
                placeholder="Enter Barcode / Scan EAN code"
                {...register('barcode')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Category Attributes Card */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <span>Category Attributes ({PRODUCT_CATEGORIES.find(c => c.value === selectedCategory)?.label})</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Pharmaceutical details specific to this category.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Manufacturer Field */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer" className="text-xs sm:text-sm">Manufacturer / Pharma Company</Label>
              <Input
                id="manufacturer"
                placeholder="e.g. GSK, Abbott, Getz Pharma"
                {...register('manufacturer')}
              />
            </div>

            {/* TABLET_CAPSULE Fields */}
            {selectedCategory === 'TABLET_CAPSULE' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dosageForm" className="text-xs sm:text-sm">Dosage Form</Label>
                  <Input
                    id="dosageForm"
                    placeholder="e.g. Film-Coated Tablet, Capsule"
                    {...register('dosageForm')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strength" className="text-xs sm:text-sm">Strength</Label>
                  <Input
                    id="strength"
                    placeholder="e.g. 500mg, 20mg"
                    {...register('strength')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packSize" className="text-xs sm:text-sm">Pack Size (Units per {selectedUnit})</Label>
                  <Input
                    id="packSize"
                    type="number"
                    placeholder={`Number of tablets/strips in 1 ${selectedUnit} (e.g. 100)`}
                    {...register('packSize')}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enables fractional / loose tablet selling at POS counter.
                  </p>
                </div>
              </>
            )}

            {/* SYRUP_LIQUID Fields */}
            {selectedCategory === 'SYRUP_LIQUID' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="volumeMl" className="text-xs sm:text-sm">Volume (ML)</Label>
                  <Input
                    id="volumeMl"
                    type="number"
                    placeholder="e.g. 120"
                    {...register('volumeMl')}
                  />
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="route" className="text-xs sm:text-sm">Route of Administration</Label>
                  <Input
                    id="route"
                    placeholder="e.g. IV / IM, Subcutaneous"
                    {...register('route')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageTemp" className="text-xs sm:text-sm">Storage Temperature</Label>
                  <Input
                    id="storageTemp"
                    placeholder="e.g. 2°C - 8°C (Refrigerated)"
                    {...register('storageTemp')}
                  />
                </div>
              </>
            )}

            {/* MEDICAL_DEVICE Fields */}
            {selectedCategory === 'MEDICAL_DEVICE' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="modelNumber" className="text-xs sm:text-sm">Model Number</Label>
                  <Input
                    id="modelNumber"
                    placeholder="e.g. BP-301"
                    {...register('modelNumber')}
                  />
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-xs sm:text-sm">Brand Name</Label>
                  <Input
                    id="brand"
                    placeholder="e.g. Dettol, Nestlé"
                    {...register('brand')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs sm:text-sm">Product Description</Label>
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" />
              <span>Compliance & Reorder Alerts</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Set low-stock reorder thresholds and prescription schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Low Stock Alert Threshold */}
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold" className="text-xs sm:text-sm">Low Stock Alert Threshold (in {selectedUnit}s)</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                placeholder="10"
                {...register('lowStockThreshold')}
              />
              <p className="text-[11px] text-muted-foreground">
                Triggers a dashboard alert when remaining stock falls below this quantity.
              </p>
            </div>

            {/* Controlled Substance Panel */}
            <div className="space-y-2">
              <Label htmlFor="isControlledSubstance" className="text-xs sm:text-sm">Regulatory Classification</Label>
              <div className="flex flex-col justify-start rounded-md border border-input p-3 bg-card gap-2.5">
                <div className="flex items-center space-x-3">
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
                  <div className="flex items-center gap-1.5 text-xs text-destructive font-medium bg-destructive/10 px-2.5 py-1.5 rounded-sm">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    <span>Requires Doctor Prescription & Audit Log at POS</span>
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
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
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
    </div>
  );
}
