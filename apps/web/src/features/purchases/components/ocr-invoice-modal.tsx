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
  Search,
  Eye,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
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
import { ProductData } from '@/features/inventory/services/products-api';
import { SupplierData } from '@/features/suppliers/services/suppliers-api';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

interface OcrInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductData[];
  suppliers: SupplierData[];
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
}

export function OcrInvoiceModal({
  open,
  onOpenChange,
  products,
  suppliers,
  defaultStoreId = '',
  onConfirmPo,
}: OcrInvoiceModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }
    >
  >([]);

  const resetState = () => {
    setStep('upload');
    setIsProcessing(false);
    setProcessingStatus('');
    setImagePreview(null);
    setFileName('');
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

  const processSelectedFile = (file: File) => {
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
    setProcessingStatus('Uploading document...');

    try {
      setProcessingStatus('Analyzing document structure & medicine items...');
      const res = await purchasesApi.parseInvoiceOcr({
        imageBase64,
        mimeType,
        fileName: name,
        storeId: selectedStoreId || undefined,
      });

      if (res && res.success) {
        setOcrResult(res);
        setInvoiceNumber(res.invoiceNumber || '');
        setInvoiceDate(res.invoiceDate || new Date().toISOString().split('T')[0]);

        // Auto-match supplier if found
        if (res.matchedSupplierId) {
          setSelectedSupplierId(res.matchedSupplierId);
        } else if (suppliers.length > 0) {
          setSelectedSupplierId(suppliers[0].id);
        }

        // Map items with internal IDs for keying
        const mapped = (res.items || []).map((it, idx) => ({
          ...it,
          id: `item-${idx}-${Date.now()}`,
          // Fallback matched product if direct match wasn't found
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

  const handleSimulateSampleInvoice = () => {
    // 1-click test invoice generator
    const dummyImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    setImagePreview(dummyImage);
    setFileName('sample_distributor_bill_pharmacy.png');
    runOcr(dummyImage, 'image/png', 'sample_distributor_bill_pharmacy.png');
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
        const q = Number(cur.quantity) || 0;
        const c = Number(cur.unitCost) || 0;
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
        batchNumber: `BAT-${new Date().getFullYear()}-001`,
        expiryDate: `${new Date().getFullYear() + 2}-01-01`,
        confidence: 1.0,
        isNewProduct: false,
      },
    ]);
  };

  // Calculations
  const calculatedSubtotal = editableItems.reduce(
    (sum, it) => sum + (Number(it.totalCost) || 0),
    0,
  );
  const calculatedTax = ocrResult?.tax
    ? Math.round((ocrResult.tax / (ocrResult.subtotal || 1)) * calculatedSubtotal * 100) / 100
    : 0;
  const calculatedTotal = calculatedSubtotal + calculatedTax;

  const handleConfirm = () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier for this purchase order.');
      return;
    }
    if (editableItems.length === 0) {
      toast.error('No items available in the invoice.');
      return;
    }

    const unmappedItem = editableItems.find((it) => !it.matchedProductId);
    if (unmappedItem) {
      toast.error(`Please match "${unmappedItem.rawProductName}" to a catalog product.`);
      return;
    }

    const payloadItems = editableItems.map((it) => ({
      productId: it.matchedProductId!,
      expectedQuantity: Number(it.quantity) || 1,
      unitCost: Number(it.unitCost) || 0,
      batchNumber: it.batchNumber || undefined,
      expiryDate: it.expiryDate || undefined,
    }));

    onConfirmPo({
      supplierId: selectedSupplierId,
      storeId: selectedStoreId || defaultStoreId,
      notes: `Generated via OCR Assist from Invoice #${invoiceNumber || 'N/A'}${
        fileName ? ` (${fileName})` : ''
      }`,
      items: payloadItems,
    });

    toast.success('Invoice data confirmed and loaded into Purchase Order.');
    onOpenChange(false);
    resetState();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetState();
        onOpenChange(val);
      }}
    >
      <DialogContent className="w-[calc(100vw-24px)] sm:max-w-4xl max-h-[88dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="p-3.5 sm:p-5 pr-12 sm:pr-14 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Camera className="size-4.5 sm:size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <DialogTitle className="text-sm sm:text-base font-bold">
                    Invoice OCR Assist
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold py-0 px-1.5"
                  >
                    AI Powered
                  </Badge>
                </div>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-none">
                  Photograph or upload a supplier bill to automatically extract and match items with zero manual entry.
                </DialogDescription>
              </div>
            </div>
            {step === 'review' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('upload')}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Re-upload</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
          {step === 'upload' ? (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
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
                    <p className="font-semibold text-xs sm:text-sm text-foreground">{processingStatus}</p>
                    <p className="text-micro sm:text-xs text-muted-foreground max-w-sm">
                      Running OCR extraction, fuzzy matching catalog items, and extracting batch metadata...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="size-12 sm:size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                      <UploadCloud className="size-6 sm:size-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground">
                        Click or drag supplier invoice here
                      </h4>
                      <p className="text-micro sm:text-xs text-muted-foreground mt-0.5 max-w-md">
                        Supports photographed distributor receipts, delivery challans, and PDF invoices (PNG, JPG, WebP, PDF up to 25MB).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs font-semibold h-8.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera className="size-3.5" />
                        <span>Select Document / Take Photo</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Demo 1-Click Sandbox Test */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 sm:size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <FileText className="size-4 sm:size-5" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-xs text-foreground">
                        No physical invoice right now?
                      </h5>
                      <p className="text-micro sm:text-xs text-muted-foreground mt-0.5">
                        Test the OCR line-item extraction and catalog fuzzy-matcher using simulated distributor bill data.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={handleSimulateSampleInvoice}
                    className="w-full sm:w-auto gap-1.5 shrink-0 text-xs font-semibold bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs h-8 cursor-pointer justify-center"
                  >
                    <FileText className="size-3.5 text-primary" />
                    <span>Try Sample Distributor Bill</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Instructions Callout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="p-3 rounded-lg border border-border/60 bg-card flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-micro flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-foreground block">Snap or Upload</strong>
                    <span>Take a photo of the printed invoice or upload a digital delivery challan.</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-card flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-micro flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-foreground block">Review & Match</strong>
                    <span>AI extracts quantities, batch numbers, and fuzzy matches against your catalog.</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-card flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-micro flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-foreground block">Confirm PO</strong>
                    <span>Never auto-commits. Confirm your purchase order with 1-click once verified.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Review & Edit Step */
            <div className="space-y-5">
              {/* Document Overview Bar */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
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
                      {editableItems.length} items extracted from {fileName || 'supplier invoice'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1.5 text-xs h-8"
                >
                  <Plus className="size-3.5" />
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
                    <p className="text-micro text-muted-foreground">
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
                    className="h-9 text-xs"
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
              <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-micro tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Catalog Match</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Batch / Lot #</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Expiry Date</th>
                        <th className="py-2.5 px-3 w-20">Qty</th>
                        <th className="py-2.5 px-3 w-28">Cost Price</th>
                        <th className="py-2.5 px-3 w-28">Total</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {editableItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground font-mono text-micro">
                            {idx + 1}
                          </td>

                          {/* Catalog Match Selector */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-1">
                              <Select
                                value={item.matchedProductId || ''}
                                onValueChange={(val) =>
                                  handleUpdateItem(idx, 'matchedProductId', val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select catalog product..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                      {p.name} ({p.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
                                <span>OCR: &quot;{item.rawProductName}&quot;</span>
                                <Badge
                                  variant="outline"
                                  className={`text-micro px-1 py-0 ${
                                    item.confidence >= 0.9
                                      ? 'bg-success/10 text-success border-success/20'
                                      : 'bg-warning/10 text-warning border-warning/20'
                                  }`}
                                >
                                  {Math.round(item.confidence * 100)}%
                                </Badge>
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
                              className="h-8 text-xs font-mono"
                            />
                          </td>

                          {/* Expiry Date */}
                          <td className="py-2.5 px-3">
                            <Input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'expiryDate', e.target.value)
                              }
                              className="h-8 text-xs"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'quantity', Number(e.target.value))
                              }
                              className="h-8 text-xs text-right font-medium"
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'unitCost', Number(e.target.value))
                              }
                              className="h-8 text-xs text-right font-medium"
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

                {/* Subtotal & Summary Footer */}
                <div className="p-3.5 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="size-4 text-warning shrink-0" />
                    <span>
                      Please verify item quantities and batch numbers against your physical invoice before confirming.
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
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
                    <div className="pl-3 border-l border-border">
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
        <DialogFooter className="p-3 sm:p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-2 shrink-0">
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
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="gap-2 text-xs font-bold h-9 px-4 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              <span>Confirm &amp; Load PO</span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
