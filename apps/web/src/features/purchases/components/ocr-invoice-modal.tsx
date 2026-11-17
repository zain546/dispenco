'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Search,
  Eye,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  ExternalLink,
  ChevronDown,
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
  purchasesApi,
  InvoiceOcrResponse,
  InvoiceOcrItemResult,
} from '../services/purchases-api';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { suppliersApi, SupplierData } from '@/features/suppliers/services/suppliers-api';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

interface OcrInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products?: ProductData[];
  suppliers?: SupplierData[];
  defaultStoreId?: string;
  onConfirmPo: (data: {
    supplierId: string;
    storeId: string;
    notes: string;
    items: Array<{
      productId: string;
      expectedQuantity: number;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
  }) => void;
  onDirectCreatePo?: (data: {
    supplierId: string;
    storeId: string;
    notes: string;
    items: Array<{
      productId: string;
      expectedQuantity: number;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
  }) => Promise<void>;
}

export function OcrInvoiceModal({
  open,
  onOpenChange,
  products: initialProducts = [],
  suppliers: initialSuppliers = [],
  defaultStoreId = '',
  onConfirmPo,
  onDirectCreatePo,
}: OcrInvoiceModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [isDirectSubmitting, setIsDirectSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Self-healing products & suppliers fallback
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<SupplierData[]>(initialSuppliers);

  // Review state
  const [ocrResult, setOcrResult] = useState<InvoiceOcrResponse | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(defaultStoreId);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [editableItems, setEditableItems] = useState<
    Array<
      InvoiceOcrItemResult & {
        id: string;
        isCatalogSearching?: boolean;
        catalogSearchQuery?: string;
      }
    >
  >([]);

  // Keep local dependencies in sync with parent props or self-fetch if empty
  useEffect(() => {
    if (initialProducts.length > 0) setProducts(initialProducts);
    if (initialSuppliers.length > 0) setSuppliers(initialSuppliers);
  }, [initialProducts, initialSuppliers]);

  useEffect(() => {
    if (open && (products.length === 0 || suppliers.length === 0)) {
      void Promise.all([
        productsApi.getProducts({ limit: 300 }),
        suppliersApi.getSuppliers(),
      ]).then(([prodRes, supRes]) => {
        if (prodRes && Array.isArray(prodRes.data)) {
          setProducts(prodRes.data);
        } else if (Array.isArray(prodRes)) {
          setProducts(prodRes);
        }
        if (supRes && Array.isArray(supRes.data)) {
          setSuppliers(supRes.data);
        } else if (Array.isArray(supRes)) {
          setSuppliers(supRes);
        }
      }).catch((err) => {
        console.warn('Failed to prefetch OCR dependencies:', err);
      });
    }
  }, [open, products.length, suppliers.length]);

  const resetState = () => {
    setStep('upload');
    setIsProcessing(false);
    setProcessingStatus('');
    setIsDragging(false);
    setImagePreview(null);
    setFileName('');
    setShowDocumentPreview(false);
    setIsDirectSubmitting(false);
    setOcrResult(null);
    setSelectedSupplierId('');
    setInvoiceNumber('');
    setInvoiceDate('');
    setEditableItems([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    // 25MB Max File Size Guard
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25MB limit. Please upload a compressed photo or document.');
      return;
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image (PNG, JPG, WebP) or PDF file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);
      await runOcr(base64Data, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const runOcr = async (
    imageBase64: string,
    mimeType: string,
    name: string,
  ) => {
    setIsProcessing(true);
    setProcessingStatus('Uploading document & pre-processing image...');

    try {
      setProcessingStatus('Analyzing document layout, extracting tables & batch codes...');
      const res = await purchasesApi.parseInvoiceOcr({
        imageBase64,
        mimeType,
        fileName: name,
        storeId: selectedStoreId || defaultStoreId || undefined,
      });

      if (res && res.success) {
        setOcrResult(res);
        setInvoiceNumber(res.invoiceNumber || '');
        setInvoiceDate(res.invoiceDate || new Date().toISOString().split('T')[0]);

        // Auto-match supplier if found, else fallback to first available supplier
        if (res.matchedSupplierId) {
          setSelectedSupplierId(res.matchedSupplierId);
        } else if (suppliers.length > 0) {
          setSelectedSupplierId(suppliers[0].id);
        }

        // Map items with internal IDs for keying
        const mapped = (res.items || []).map((it, idx) => ({
          ...it,
          id: `item-${idx}-${Date.now()}`,
          matchedProductId:
            it.matchedProductId || (products.length > 0 ? products[0].id : null),
        }));
        setEditableItems(mapped);

        setStep('review');
        toast.success(
          `Extracted ${res.items.length} line items with ${Math.round(res.confidence * 100)}% confidence`,
        );
      } else {
        toast.error('Failed to extract invoice items from document.');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to process invoice OCR'));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleUpdateItem = (
    index: number,
    field: keyof InvoiceOcrItemResult,
    val: unknown,
  ) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: val };

      // Update total cost automatically if quantity or unit cost changed
      if (field === 'quantity' || field === 'unitCost') {
        const q = Math.max(0, Number(cur.quantity) || 0);
        const c = Math.max(0, Number(cur.unitCost) || 0);
        cur.totalCost = Math.round(q * c * 100) / 100;
      }

      // If user selected a different product, update metadata
      if (field === 'matchedProductId') {
        const found = products.find((p) => p.id === val);
        if (found) {
          cur.matchedProductName = found.name;
          cur.unit = found.unit;
          cur.category = found.category;
          cur.genericName = found.genericName;
          cur.isNewProduct = false;
        }
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    const nextYear = new Date().getFullYear() + 2;
    setEditableItems((prev) => [
      ...prev,
      {
        id: `new-item-${Date.now()}`,
        rawProductName: firstProd ? firstProd.name : 'New Medicine Item',
        matchedProductId: firstProd ? firstProd.id : null,
        matchedProductName: firstProd ? firstProd.name : 'Manual Item',
        quantity: 10,
        unitCost: firstProd?.latestCostPrice || 50,
        totalCost: 10 * (firstProd?.latestCostPrice || 50),
        batchNumber: `BAT-${nextYear}-001`,
        expiryDate: `${nextYear}-06-30`,
        confidence: 1.0,
        isNewProduct: false,
      },
    ]);
  };

  // Financial Calculations
  const calculatedSubtotal = editableItems.reduce(
    (sum, it) => sum + (Number(it.totalCost) || 0),
    0,
  );
  const calculatedTax = ocrResult?.tax
    ? Math.round((ocrResult.tax / (ocrResult.subtotal || 1)) * calculatedSubtotal * 100) / 100
    : 0;
  const calculatedTotal = calculatedSubtotal + calculatedTax;

  const validateReviewItems = () => {
    if (!selectedSupplierId) {
      toast.error('Please select a distributor / supplier for this order.');
      return false;
    }
    if (editableItems.length === 0) {
      toast.error('No items available in the invoice. Please add at least one line item.');
      return false;
    }

    const unmappedItem = editableItems.find((it) => !it.matchedProductId);
    if (unmappedItem) {
      toast.error(`Please match "${unmappedItem.rawProductName}" to a catalog product.`);
      return false;
    }

    const invalidQty = editableItems.find((it) => Number(it.quantity) <= 0);
    if (invalidQty) {
      toast.error(`Quantity for "${invalidQty.matchedProductName || 'item'}" must be greater than zero.`);
      return false;
    }

    return true;
  };

  const buildPayloadData = () => {
    const payloadItems = editableItems.map((it) => ({
      productId: it.matchedProductId!,
      expectedQuantity: Number(it.quantity) || 1,
      unitCost: Number(it.unitCost) || 0,
      batchNumber: it.batchNumber?.trim() || undefined,
      expiryDate: it.expiryDate || undefined,
    }));

    const batchSummary = editableItems
      .filter((it) => it.batchNumber)
      .map((it) => `${it.matchedProductName}: #${it.batchNumber} (Exp: ${it.expiryDate || 'N/A'})`)
      .slice(0, 3)
      .join(', ');

    return {
      supplierId: selectedSupplierId,
      storeId: selectedStoreId || defaultStoreId,
      notes: `Generated via OCR Assist from Invoice #${invoiceNumber || 'N/A'}${
        fileName ? ` (${fileName})` : ''
      }${batchSummary ? ` | Intake Batches: ${batchSummary}` : ''}`,
      items: payloadItems,
    };
  };

  const handleConfirmToDraft = () => {
    if (!validateReviewItems()) return;
    const data = buildPayloadData();
    onConfirmPo(data);
    toast.success('Invoice data confirmed and loaded into Purchase Order form.');
    onOpenChange(false);
    resetState();
  };

  const handleDirectCreate = async () => {
    if (!validateReviewItems()) return;
    if (!onDirectCreatePo) {
      handleConfirmToDraft();
      return;
    }

    setIsDirectSubmitting(true);
    try {
      const data = buildPayloadData();
      await onDirectCreatePo(data);
      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create purchase order directly'));
    } finally {
      setIsDirectSubmitting(false);
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
      <DialogContent className="w-[calc(100vw-20px)] sm:max-w-4xl lg:max-w-5xl max-h-[92dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl border border-border bg-background shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="p-3.5 sm:px-6 sm:py-4.5 pr-12 sm:pr-14 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Camera className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    Invoice OCR Assist
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/25 text-micro font-bold py-0.5 px-2 uppercase tracking-wide"
                  >
                    AI Powered
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-normal">
                  Photograph or upload a supplier bill to automatically extract and match items.
                </DialogDescription>
              </div>
            </div>

            {step === 'review' && (
              <div className="flex items-center gap-2 shrink-0">
                {imagePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                    className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    <Eye className="size-3.5 text-primary" />
                    <span className="hidden sm:inline">
                      {showDocumentPreview ? 'Hide Document' : 'View Document'}
                    </span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('upload')}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span className="hidden sm:inline">Re-upload</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
          {step === 'upload' ? (
            <div className="space-y-4">
              {/* Working Drag-and-Drop Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 sm:gap-3.5 ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[0.99] ring-4 ring-primary/10'
                    : isProcessing
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
                  <div className="flex flex-col items-center gap-3.5 py-4">
                    <div className="relative">
                      <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="size-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="font-bold text-sm text-foreground">{processingStatus}</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Running OCR analysis, extracting quantities, batch codes, and fuzzy matching catalog formulas...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`size-12 sm:size-14 rounded-2xl flex items-center justify-center transition-colors shadow-xs ${
                      isDragging ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      <UploadCloud className="size-6 sm:size-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm sm:text-base text-foreground">
                        <span className="sm:hidden">Tap to snap photo or upload bill</span>
                        <span className="hidden sm:inline">
                          {isDragging ? 'Drop your invoice file here' : 'Click or drag supplier invoice here'}
                        </span>
                      </h4>
                      <p className="text-micro sm:text-xs text-muted-foreground max-w-md mx-auto">
                        Supports photographed receipts, delivery challans, and PDFs (up to 25MB).
                      </p>
                    </div>
                    <div className="pt-0.5 sm:pt-1 w-full sm:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto gap-2 text-xs font-semibold h-9.5 sm:h-9 px-4.5 cursor-pointer shadow-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera className="size-4" />
                        <span>Take Photo or Upload File</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* 3-Step Verification Guide */}
              {/* Mobile: Compact Horizontal Stepper Pill */}
              <div className="sm:hidden p-3 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-micro font-medium text-foreground px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="size-4.5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs font-semibold">Snap Bill</span>
                  </div>
                  <span className="text-muted-foreground/50">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="size-4.5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs font-semibold">AI Match</span>
                  </div>
                  <span className="text-muted-foreground/50">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="size-4.5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs font-semibold">Confirm PO</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Items, batch numbers &amp; costs are matched against your catalog.
                </p>
              </div>

              {/* Desktop: 3-Card Grid */}
              <div className="hidden sm:grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-foreground block font-semibold mb-0.5">Snap or Upload</strong>
                    <span>Take a photo of the printed invoice or upload a digital delivery challan.</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-foreground block font-semibold mb-0.5">Review &amp; Match</strong>
                    <span>AI extracts quantities, batch numbers, and fuzzy matches against your catalog.</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-foreground block font-semibold mb-0.5">Confirm PO</strong>
                    <span>Never auto-commits. Confirm your purchase order with 1-click once verified.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Review & Edit Step */
            <div className="space-y-4 sm:space-y-5">
              {/* Optional Document Viewer Preview */}
              {showDocumentPreview && imagePreview && (
                <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary" />
                      <span>Original Document Preview: {fileName || 'supplier_bill'}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDocumentPreview(false)}
                      className="h-6 px-2 text-micro text-muted-foreground cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2 flex items-center justify-center">
                    {imagePreview.startsWith('data:image') ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={imagePreview}
                        alt="Uploaded supplier invoice preview"
                        className="max-h-56 object-contain rounded shadow-2xs"
                      />
                    ) : (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        <FileText className="size-8 mx-auto text-primary mb-1" />
                        <span>PDF Document Loaded ({fileName})</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Document Overview Bar */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0 border border-success/20">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        OCR Analysis Verified
                      </span>
                      {ocrResult && (
                        <Badge
                          variant="outline"
                          className="bg-success/10 text-success border-success/20 text-micro font-semibold"
                        >
                          {Math.round(ocrResult.confidence * 100)}% Confidence
                        </Badge>
                      )}
                      {ocrResult?.ocrEngine && (
                        <Badge variant="secondary" className="text-micro capitalize">
                          {ocrResult.ocrEngine.replace(/-/g, ' ')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {editableItems.length} line items extracted from {fileName || 'supplier invoice'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1.5 text-xs h-8.5 font-semibold cursor-pointer"
                >
                  <Plus className="size-3.5 text-primary" />
                  <span>Add Line Item</span>
                </Button>
              </div>

              {/* Header Inputs: Supplier, Invoice #, Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <span>Distributor / Supplier</span>
                  </Label>
                  <Select
                    value={selectedSupplierId}
                    onValueChange={setSelectedSupplierId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {ocrResult?.rawSupplierName && (
                    <p className="text-micro text-muted-foreground truncate">
                      Extracted name: <strong>{ocrResult.rawSupplierName}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span>Invoice / Bill #</span>
                  </Label>
                  <Input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-98421"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>Invoice Date</span>
                  </Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Extracted Items Table */}
              <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-micro tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3 min-w-[220px]">Catalog Match</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Batch / Lot #</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Expiry Date</th>
                        <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                        <th className="py-2.5 px-3 w-28 text-right">Cost (PKR)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Total (PKR)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {editableItems.map((item, idx) => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const isExpired = Boolean(item.expiryDate && item.expiryDate < todayStr);

                        return (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3 text-muted-foreground font-mono text-micro">
                              {idx + 1}
                            </td>

                            {/* Catalog Match Selector with Search Filter */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <Select
                                  value={item.matchedProductId || ''}
                                  onValueChange={(val) =>
                                    handleUpdateItem(idx, 'matchedProductId', val)
                                  }
                                >
                                  <SelectTrigger className="h-8.5 text-xs bg-background">
                                    <SelectValue placeholder="Match catalog product..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={p.id} className="text-xs">
                                        <div className="flex items-center justify-between gap-2 w-full">
                                          <span className="font-medium text-foreground">{p.name}</span>
                                          <span className="text-micro text-muted-foreground font-mono">({p.unit})</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
                                  <span className="truncate max-w-[160px]" title={item.rawProductName}>
                                    OCR: &quot;{item.rawProductName}&quot;
                                  </span>
                                  {item.matchedProductId ? (
                                    <Badge
                                      variant="outline"
                                      className={`text-micro px-1 py-0 shrink-0 ${
                                        item.confidence >= 0.9
                                          ? 'bg-success/10 text-success border-success/20'
                                          : 'bg-warning/10 text-warning border-warning/20'
                                      }`}
                                    >
                                      {Math.round(item.confidence * 100)}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-micro px-1 py-0 shrink-0">
                                      Needs Match
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Batch Number */}
                            <td className="py-2.5 px-3">
                              <Input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'batchNumber', e.target.value)
                                }
                                placeholder="Batch #"
                                className="h-8.5 text-xs font-mono bg-background"
                              />
                            </td>

                            {/* Expiry Date */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-0.5">
                                <Input
                                  type="date"
                                  value={item.expiryDate || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(idx, 'expiryDate', e.target.value)
                                  }
                                  className={`h-8.5 text-xs bg-background ${
                                    isExpired ? 'border-destructive text-destructive' : ''
                                  }`}
                                />
                                {isExpired && (
                                  <span className="text-[10px] text-destructive font-semibold block">
                                    Date in past
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Quantity */}
                            <td className="py-2.5 px-3 text-right">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'quantity', Number(e.target.value))
                                }
                                className="h-8.5 text-xs text-right font-medium bg-background"
                              />
                            </td>

                            {/* Unit Cost */}
                            <td className="py-2.5 px-3 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'unitCost', Number(e.target.value))
                                }
                                className="h-8.5 text-xs text-right font-medium bg-background"
                              />
                            </td>

                            {/* Total Cost */}
                            <td className="py-2.5 px-3 text-right font-bold text-xs tabular-nums text-foreground">
                              {formatCurrency(item.totalCost)}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(idx)}
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal & Summary Footer */}
                <div className="p-3.5 sm:p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="size-4 text-warning shrink-0" />
                    <span>
                      Please verify item quantities and batch numbers against your physical invoice before confirming.
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-right">
                    <div>
                      <span className="text-muted-foreground text-micro block">Subtotal</span>
                      <strong className="text-foreground text-xs">{formatCurrency(calculatedSubtotal)}</strong>
                    </div>
                    {calculatedTax > 0 && (
                      <div>
                        <span className="text-muted-foreground text-micro block">Tax</span>
                        <strong className="text-foreground text-xs">{formatCurrency(calculatedTax)}</strong>
                      </div>
                    )}
                    <div className="pl-3 border-l border-border/80">
                      <span className="text-muted-foreground text-micro block font-semibold">Total Order</span>
                      <strong className="text-primary text-sm font-bold">{formatCurrency(calculatedTotal)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:px-6 sm:py-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>

          {step === 'review' && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConfirmToDraft}
                disabled={isDirectSubmitting}
                className="gap-1.5 text-xs font-semibold h-9 px-3 bg-card hover:bg-muted border-border/80 text-foreground cursor-pointer shrink-0"
              >
                <span className="sm:hidden">Draft PO</span>
                <span className="hidden sm:inline">Load into Draft PO</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleDirectCreate}
                disabled={isDirectSubmitting}
                className="gap-2 text-xs font-bold h-9 px-3.5 sm:px-4 bg-primary text-primary-foreground shadow-xs cursor-pointer shrink-0"
              >
                {isDirectSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                <span className="sm:hidden">Confirm PO</span>
                <span className="hidden sm:inline">Confirm &amp; Create PO</span>
                <ArrowRight className="size-3.5 hidden sm:inline" />
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
