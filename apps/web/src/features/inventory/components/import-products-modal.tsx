'use client';

import React, { useState } from 'react';
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
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  Sparkles,
  FileText,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { importApi, CsvParseResult, CsvPreviewRow } from '../services/import-api';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_CSV = `Product Name,Category,Unit Price,Cost Price,Barcode,Initial Stock,Batch Number,Expiry Date
Augmentin 625mg,TABLET_CAPSULE,550.00,420.00,8964000111222,50,AUG-2026-01,2026-12-31
Panadol Extra 500mg,TABLET_CAPSULE,45.00,32.00,8964000333444,120,PAN-2026-04,2026-10-15
Brufen 400mg,TABLET_CAPSULE,180.00,135.00,8964000555666,80,BRU-2026-08,2027-05-20
Softin 10mg Syrup,SYRUP_SUSPENSION,110.00,85.00,8964000777888,30,SOF-2026-09,2026-08-30`;

const TARGET_FIELDS = [
  { key: 'name', label: 'Product Name *', required: true },
  { key: 'category', label: 'Category', required: false },
  { key: 'unitprice', label: 'Unit Price (PKR) *', required: true },
  { key: 'costprice', label: 'Cost Price (PKR)', required: false },
  { key: 'barcode', label: 'Barcode / EAN', required: false },
  { key: 'initialstock', label: 'Initial Stock Qty', required: false },
  { key: 'batchnumber', label: 'Batch Number', required: false },
  { key: 'expirydate', label: 'Expiry Date', required: false },
];

export function ImportProductsModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportProductsModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [inputMode, setInputMode] = useState<'file' | 'raw'>('file');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [showMapping, setShowMapping] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('Sample_Pharmacy_Inventory.csv');
    setCsvContent(SAMPLE_CSV);
    toast.info('Loaded sample pharmacy CSV data');
  };

  const handleParseAndPreview = async () => {
    if (!csvContent.trim()) {
      toast.error('Please upload a CSV file or paste CSV text');
      return;
    }

    try {
      setIsParsing(true);
      const res = await importApi.parseCsv(csvContent, columnMapping);
      setParseResult(res);
      setPreviewRows(res.preview);

      // Auto initialize mapping from headers if not already set
      if (res.summary.headers.length > 0 && Object.keys(columnMapping).length === 0) {
        const initialMapping: Record<string, string> = {};
        TARGET_FIELDS.forEach((tf) => {
          const matchedHeader = res.summary.headers.find(
            (h) => h.toLowerCase().includes(tf.key) || h.toLowerCase().includes(tf.label.toLowerCase())
          );
          if (matchedHeader) {
            initialMapping[tf.key] = matchedHeader;
          }
        });
        setColumnMapping(initialMapping);
      }

      setStep(2);
    } catch (err: unknown) {
      console.error('Parse error:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to parse CSV file';
      toast.error(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyCustomMapping = async (newMapping: Record<string, string>) => {
    setColumnMapping(newMapping);
    try {
      setIsParsing(true);
      const res = await importApi.parseCsv(csvContent, newMapping);
      setParseResult(res);
      setPreviewRows(res.preview);
      toast.success('Updated column mapping & revalidated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to apply custom mapping';
      toast.error(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const togglePriorityRow = (index: number) => {
    setPreviewRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, data: { ...row.data, isPriority: !row.data.isPriority } }
          : row
      )
    );
  };

  const handleConfirmImport = async () => {
    const validItems = previewRows
      .filter((r) => r.status === 'VALID')
      .map((r) => r.data);

    if (validItems.length === 0) {
      toast.error('No valid product rows available for import');
      return;
    }

    try {
      setIsConfirming(true);
      const res = await importApi.confirmImport(validItems);
      toast.success(res.message || `Successfully imported ${res.importedCount} products!`);
      onSuccess();
      onClose();
      resetState();
    } catch (err: unknown) {
      console.error('Confirm import error:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to confirm product import';
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setInputMode('file');
    setCsvContent('');
    setFileName('');
    setParseResult(null);
    setPreviewRows([]);
    setColumnMapping({});
    setShowMapping(false);
  };

  const filteredPreview = previewRows.filter((r) => {
    if (filterStatus === 'VALID') return r.status === 'VALID';
    if (filterStatus === 'INVALID') return r.status === 'INVALID';
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-full h-[90vh] max-h-[720px] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border">
        {/* Sticky Header & Progress Indicator */}
        <DialogHeader className="p-5 pb-4 border-b shrink-0 bg-background space-y-3">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileSpreadsheet className="size-6 text-primary" />
              <span>CSV Inventory Migration & Data Import</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Import your existing Excel/CSV medicine catalog into Dispenco with automatic header mapping and validation.
            </DialogDescription>
          </div>

          {/* 2-Step Indicator Progress Bar */}
          <div className="flex items-center justify-between pt-1">
            <div
              className={`flex items-center gap-2 text-xs font-semibold ${
                step >= 1 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`size-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                1
              </span>
              <span>Upload / Select CSV File</span>
            </div>
            <div className="h-0.5 flex-1 bg-border mx-4" />
            <div
              className={`flex items-center gap-2 text-xs font-semibold ${
                step >= 2 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`size-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </span>
              <span>Validation & Import Preview</span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body Section */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/10">
          {/* STEP 1: Upload CSV */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/50 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      inputMode === 'file'
                        ? 'bg-background shadow-2xs text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="size-3.5" />
                    <span>Upload CSV File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('raw')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      inputMode === 'raw'
                        ? 'bg-background shadow-2xs text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="size-3.5" />
                    <span>Paste Raw CSV Text</span>
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleLoadSample} className="gap-1.5 text-xs h-8">
                  <Download className="size-3.5 text-primary" />
                  <span>Load Sample CSV Data</span>
                </Button>
              </div>

              {inputMode === 'file' ? (
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 transition-colors bg-background">
                  <Upload className="size-10 text-primary mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-foreground">
                    Upload Pharmacy Excel or CSV Sheet
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Drag and drop your catalog `.csv` file here, or click to browse files on your device.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="max-w-xs cursor-pointer text-xs"
                    />
                  </div>
                  {fileName && (
                    <div className="mt-3 text-xs font-semibold text-primary flex items-center justify-center gap-1">
                      <CheckCircle2 className="size-4" /> Selected File: {fileName}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Paste Raw CSV Data</Label>
                    <span className="text-[11px] text-muted-foreground">Comma-separated values with headers</span>
                  </div>
                  <textarea
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="Product Name, Category, Price, Stock..."
                    rows={8}
                    className="w-full text-xs font-mono p-3 rounded-lg border bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview, Validation & Priority Selection */}
          {step === 2 && parseResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-background border-muted">
                  <div className="text-xs text-muted-foreground font-medium">Total Rows</div>
                  <div className="text-lg font-bold text-foreground">{previewRows.length}</div>
                </Card>
                <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
                  <div className="text-xs text-emerald-600 font-medium">Valid Ready to Import</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {previewRows.filter((r) => r.status === 'VALID').length}
                  </div>
                </Card>
                <Card className="p-3 bg-destructive/10 border-destructive/30">
                  <div className="text-xs text-destructive font-medium">Invalid Rows</div>
                  <div className="text-lg font-bold text-destructive">
                    {previewRows.filter((r) => r.status === 'INVALID').length}
                  </div>
                </Card>
              </div>

              {/* Filter bar, Priority Hint & Column Mapping Toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-muted-foreground">Filter:</span>
                  <Button
                    variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('ALL')}
                    className="h-7 text-xs"
                  >
                    All ({previewRows.length})
                  </Button>
                  <Button
                    variant={filterStatus === 'VALID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('VALID')}
                    className="h-7 text-xs text-emerald-600"
                  >
                    Valid Only
                  </Button>
                  <Button
                    variant={filterStatus === 'INVALID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('INVALID')}
                    className="h-7 text-xs text-destructive"
                  >
                    Invalid Only
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMapping((prev) => !prev)}
                    className="h-7 text-xs gap-1 border-border/80"
                  >
                    <Settings2 className="size-3.5 text-primary" />
                    <span>Column Mapping</span>
                    {showMapping ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                </div>
              </div>

              {/* Optional Collapsible Column Mapping Drawer */}
              {showMapping && (
                <Card className="p-3.5 bg-background border-primary/30 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Custom Column Mapping</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Match your CSV headers to Dispenco product attributes if your file uses custom column names.
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {parseResult.summary.headers.length} Headers Found
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {TARGET_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span>{field.label}</span>
                        </div>
                        <Select
                          value={columnMapping[field.key] || '__NONE__'}
                          onValueChange={(val) => {
                            const updated = {
                              ...columnMapping,
                              [field.key]: val === '__NONE__' ? '' : val,
                            };
                            handleApplyCustomMapping(updated);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs bg-background">
                            <SelectValue placeholder="Select CSV Column..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__NONE__">-- Do Not Map --</SelectItem>
                            {parseResult.summary.headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-x-auto max-h-[320px] bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b sticky top-0 text-muted-foreground uppercase text-[10px] z-10">
                    <tr>
                      <th className="p-2 w-12 text-center">Row</th>
                      <th className="p-2 w-20">Status</th>
                      <th className="p-2">Product Name</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-center">Initial Stock</th>
                      <th className="p-2">Errors / Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPreview.map((row, idx) => (
                      <tr
                        key={row.rowNumber}
                        className={row.status === 'INVALID' ? 'bg-destructive/5' : 'hover:bg-muted/30'}
                      >
                        <td className="p-2 font-mono text-center text-muted-foreground">{row.rowNumber}</td>
                        <td className="p-2">
                          {row.status === 'VALID' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 text-[10px] gap-1 border-0 font-bold">
                              <CheckCircle2 className="size-3" /> Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] gap-1 font-bold">
                              <AlertCircle className="size-3" /> Error
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 font-semibold text-foreground">{row.data.name}</td>
                        <td className="p-2 font-mono text-[11px] text-muted-foreground">{row.data.category}</td>
                        <td className="p-2 text-right font-semibold">PKR {row.data.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-center font-bold">
                          {row.data.initialStockQuantity ? row.data.initialStockQuantity : '-'}
                        </td>
                        <td className="p-2">
                          {row.errors.length > 0 ? (
                            <div className="text-[11px] text-destructive font-medium">
                              {row.errors.join('; ')}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Ready to import</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <DialogFooter className="p-4 border-t shrink-0 bg-background flex items-center justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              disabled={isParsing || isConfirming}
              className="gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="size-3.5" /> Back to Upload
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
          )}

          {step === 1 && (
            <Button
              onClick={handleParseAndPreview}
              disabled={isParsing || !csvContent.trim()}
              size="sm"
              className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isParsing && <Loader2 className="size-3.5 animate-spin" />}
              Parse & Preview Catalog <ArrowRight className="size-3.5" />
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={handleConfirmImport}
              disabled={isConfirming || previewRows.filter((r) => r.status === 'VALID').length === 0}
              size="sm"
              className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isConfirming ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Confirm Import ({previewRows.filter((r) => r.status === 'VALID').length} Products)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
