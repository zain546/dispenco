import React, { useState, useRef } from 'react';
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
  FileText,
  Settings2,
  ChevronDown,
  ChevronUp,
  Pill,
  MapPin,
  Building2,
  Calendar,
  Info,
  Search,
  X,
  Edit3,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Eye,
  DollarSign,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { importApi, CsvParseResult, CsvPreviewRow } from '../services/import-api';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_CSV = `Product Name,Generic Name,Category,Packaging Unit,Selling Price,Cost Price,Barcode,Initial Stock,Batch Number,Expiry Date,Manufacturer,Rack Location,Strength,Dosage Form,Low Stock Alert,Controlled Drug
Augmentin 625mg,Amoxicillin + Clavulanate,TABLET_CAPSULE,PACK,550.00,420.00,8964000111222,50,AUG-2026-01,2026-12-31,GSK Pakistan,Rack A-01,625mg,Tablet,10,No
Panadol Extra 500mg,Paracetamol + Caffeine,TABLET_CAPSULE,STRIP,45.00,32.00,8964000333444,120,PAN-2026-04,2026-10-15,Haleon,Rack B-04,500mg,Tablet,20,No
Brufen 400mg,Ibuprofen,TABLET_CAPSULE,PACK,180.00,135.00,8964000555666,80,BRU-2026-08,2027-05-20,Abbott,Rack C-02,400mg,Tablet,15,No
Softin 10mg Syrup,Loratadine,SYRUP_LIQUID,BOTTLE,110.00,85.00,8964000777888,30,SOF-2026-09,2026-08-30,Getz Pharma,Rack D-01,10mg/5ml,Syrup,10,No
Rocephin 1g Injection,Ceftriaxone,INJECTION_INFUSION,VIAL,480.00,350.00,8964000999000,25,ROC-2026-12,2027-11-15,Roche,Rack E-05,1g,Injection,5,Yes`;

const TARGET_FIELDS = [
  { key: 'name', label: 'Product / Brand Name *', required: true },
  { key: 'genericname', label: 'Generic / Salt Formula', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'unit', label: 'Packaging Unit (Pack/Strip/Bottle)', required: false },
  { key: 'unitprice', label: 'Selling Price (PKR) *', required: true },
  { key: 'costprice', label: 'Cost / Purchase Price (PKR)', required: false },
  { key: 'barcode', label: 'Barcode / EAN / UPC', required: false },
  { key: 'initialstock', label: 'Initial Stock Qty', required: false },
  { key: 'batchnumber', label: 'Batch / Lot Number', required: false },
  { key: 'expirydate', label: 'Expiry Date (YYYY-MM-DD)', required: false },
  { key: 'manufacturer', label: 'Manufacturer / Brand', required: false },
  { key: 'racknumber', label: 'Shelf / Rack Location', required: false },
  { key: 'strength', label: 'Medicine Strength (500mg, 10mg/5ml)', required: false },
  { key: 'dosageform', label: 'Dosage Form (Tablet, Syrup)', required: false },
  { key: 'lowstockthreshold', label: 'Reorder / Low Stock Level', required: false },
  { key: 'iscontrolledsubstance', label: 'Controlled / Rx Flag', required: false },
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
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMapping, setShowMapping] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CsvPreviewRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
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
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
        toast.success(`Uploaded ${file.name}`);
      };
      reader.readAsText(file);
    } else {
      toast.error('Please drop a valid .csv file');
    }
  };

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
    setFileName('Sample_Complete_Pharmacy_Inventory.csv');
    setCsvContent(SAMPLE_CSV);
    toast.info('Loaded full sample pharmacy medicine catalog');
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Dispenco_Pharmacy_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded pharmacy CSV import template');
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

  const handleUpdateRowData = (rowNumber: number, field: string, value: any) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row;
        const updatedData = { ...row.data, [field]: value };
        const errors: string[] = [];
        if (!updatedData.name || updatedData.name.length < 2) {
          errors.push('Product name is required');
        }
        if (isNaN(updatedData.unitPrice) || updatedData.unitPrice < 0) {
          errors.push('Unit price must be positive');
        }
        const status: 'VALID' | 'INVALID' = errors.length === 0 ? 'VALID' : 'INVALID';
        const updatedRow: CsvPreviewRow = { ...row, status, data: updatedData, errors };
        if (selectedRow?.rowNumber === rowNumber) {
          setSelectedRow(updatedRow);
        }
        return updatedRow;
      })
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
      toast.success(res.message || `Successfully imported ${res.importedCount} medicine catalog items!`);
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
    setSelectedRow(null);
    setSearchQuery('');
  };

  const filteredPreview = previewRows.filter((r) => {
    if (filterStatus === 'VALID' && r.status !== 'VALID') return false;
    if (filterStatus === 'INVALID' && r.status !== 'INVALID') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.data.name.toLowerCase().includes(q);
      const genericMatch = r.data.genericName?.toLowerCase().includes(q) ?? false;
      const mfgMatch = r.data.manufacturer?.toLowerCase().includes(q) ?? false;
      const batchMatch = r.data.batchNumber?.toLowerCase().includes(q) ?? false;
      const barcodeMatch = r.data.barcode?.toLowerCase().includes(q) ?? false;
      return nameMatch || genericMatch || mfgMatch || batchMatch || barcodeMatch;
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-full h-[92vh] max-h-[820px] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-background">
        {/* Sticky Header & Sleek Progress Stepper */}
        <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                <FileSpreadsheet className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <span>CSV Inventory Migration & Data Import</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    v2.0 Professional
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Import medicine catalogs, salt formulas, pricing, shelf locations, batches & expiry dates seamlessly.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 text-xs h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              <Download className="size-3.5" />
              <span>Download CSV Template</span>
            </Button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="relative flex items-center justify-between pt-2">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />

            <div className="relative z-10 flex items-center gap-2.5 bg-background pr-4">
              <div
                className={`size-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                  step >= 1
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/10'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                1
              </div>
              <div>
                <div className={`text-xs font-bold ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Upload CSV File
                </div>
                <div className="text-[10px] text-muted-foreground">Drop file or paste CSV text</div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2.5 bg-background pl-4">
              <div
                className={`size-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                  step >= 2
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/10'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </div>
              <div>
                <div className={`text-xs font-bold ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Validate & Preview
                </div>
                <div className="text-[10px] text-muted-foreground">Column mapping & data check</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body Section */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-muted/15">
          {/* STEP 1: Upload CSV */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border/60 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                      inputMode === 'file'
                        ? 'bg-background shadow-xs text-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="size-3.5" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('raw')}
                    className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
                      inputMode === 'raw'
                        ? 'bg-background shadow-xs text-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="size-3.5" />
                    <span>Paste Raw Text</span>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadSample}
                  className="gap-2 text-xs h-8 text-primary hover:bg-primary/10 font-semibold"
                >
                  <Pill className="size-3.5" />
                  <span>Load Sample Pharmacy Catalog</span>
                </Button>
              </div>

              {inputMode === 'file' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 relative overflow-hidden ${
                    isDragging
                      ? 'border-primary bg-primary/10 scale-[1.005] shadow-lg'
                      : fileName
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border/80 bg-background hover:border-primary/50 hover:bg-muted/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {fileName ? (
                    <div className="space-y-3">
                      <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                        <CheckCircle2 className="size-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
                          <span>{fileName}</span>
                          <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px] font-mono">Ready</Badge>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          File loaded successfully. Click below to parse and preview.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileName('');
                            setCsvContent('');
                          }}
                          className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <X className="size-3" /> Clear File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-xs animate-pulse">
                        <Upload className="size-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {isDragging ? 'Drop your CSV file here...' : 'Upload Pharmacy Excel or CSV Sheet'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                          Drag & drop your `.csv` file here, or click to browse. Automatically maps Trade Names, Salt Formulas, Manufacturers, Rack Locations & Batches.
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold gap-2">
                        <FileSpreadsheet className="size-3.5" /> Browse File
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Paste Raw CSV Content</Label>
                    <span className="text-[11px] text-muted-foreground font-mono">Comma-separated values</span>
                  </div>
                  <textarea
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="Product Name, Generic Name, Category, Unit Price, Cost Price, Barcode, Initial Stock..."
                    rows={9}
                    className="w-full text-xs font-mono p-4 rounded-xl border bg-background resize-none focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                  />
                </div>
              )}

              {/* Supported Medicine Attributes Grid */}
              <Card className="p-4 bg-background/80 border-border/80 space-y-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  <span>Supported Medicine Fields & Smart Mapping Heuristics:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Brand / Trade Name *</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Salt Formula / Generic</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Retail Selling Price *</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Purchase Cost Price</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Category & Unit</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Manufacturer / Brand</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Shelf / Rack Location</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Initial Stock Qty</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Batch / Lot Number</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Expiry Date (YYYY-MM-DD)</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Barcode / EAN / UPC</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Rx / Controlled Flag</div>
                </div>
              </Card>
            </div>
          )}

          {/* STEP 2: Validation & Preview */}
          {step === 2 && parseResult && (
            <div className="space-y-4">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3.5 bg-background border-border/80 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Total CSV Rows</span>
                    <Package className="size-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{previewRows.length}</div>
                </Card>
                <Card className="p-3.5 bg-emerald-500/10 border-emerald-500/30 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-semibold">Valid & Ready to Import</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {previewRows.filter((r) => r.status === 'VALID').length}
                  </div>
                </Card>
                <Card className="p-3.5 bg-destructive/10 border-destructive/30 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-destructive font-semibold">Validation Errors</span>
                    <AlertCircle className="size-4 text-destructive" />
                  </div>
                  <div className="text-2xl font-bold text-destructive mt-1">
                    {previewRows.filter((r) => r.status === 'INVALID').length}
                  </div>
                </Card>
              </div>

              {/* Controls Bar: Filter Pills, Search Bar, Mapping Drawer */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Search medicine, salt, batch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-48 sm:w-64 bg-background"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ALL')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                        filterStatus === 'ALL'
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({previewRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('VALID')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                        filterStatus === 'VALID'
                          ? 'bg-background text-emerald-600 shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Valid ({previewRows.filter((r) => r.status === 'VALID').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('INVALID')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                        filterStatus === 'INVALID'
                          ? 'bg-background text-destructive shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Errors ({previewRows.filter((r) => r.status === 'INVALID').length})
                    </button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMapping((prev) => !prev)}
                  className="h-8 text-xs gap-1.5 border-border/80 bg-background hover:bg-muted"
                >
                  <Settings2 className="size-3.5 text-primary" />
                  <span>Column Mapping</span>
                  {showMapping ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </Button>
              </div>

              {/* Collapsible Custom Column Mapping Drawer */}
              {showMapping && (
                <Card className="p-4 bg-background border-primary/30 space-y-3 shadow-md rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Settings2 className="size-4 text-primary" /> Custom Header Mapping Engine
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Explicitly link your custom CSV headers to Dispenco pharmacy database fields.
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {parseResult.summary.headers.length} Headers Found
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {TARGET_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
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
                          <SelectTrigger className="h-7 text-xs bg-background border-border">
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

              {/* Table & Inline Row Inspector Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Table Container */}
                <div className={`border rounded-xl overflow-x-auto max-h-[380px] bg-background shadow-xs ${selectedRow ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/80 border-b sticky top-0 text-muted-foreground uppercase text-[10px] z-10 backdrop-blur-xs font-bold">
                      <tr>
                        <th className="p-2.5 w-8 text-center">#</th>
                        <th className="p-2.5 w-20">Status</th>
                        <th className="p-2.5 min-w-[160px]">Medicine & Salt Formula</th>
                        <th className="p-2.5">Category & Unit</th>
                        <th className="p-2.5">Manufacturer / Rack</th>
                        <th className="p-2.5 text-right">Selling Price</th>
                        <th className="p-2.5 text-center">Stock</th>
                        <th className="p-2.5">Batch & Expiry</th>
                        <th className="p-2.5 w-10 text-center">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredPreview.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground text-xs">
                            No matching catalog rows found for current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreview.map((row) => (
                          <tr
                            key={row.rowNumber}
                            onClick={() => setSelectedRow(row)}
                            className={`cursor-pointer transition-colors ${
                              selectedRow?.rowNumber === row.rowNumber
                                ? 'bg-primary/10 border-l-4 border-l-primary'
                                : row.status === 'INVALID'
                                ? 'bg-destructive/5 hover:bg-destructive/10'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <td className="p-2.5 font-mono text-center text-muted-foreground">{row.rowNumber}</td>
                            <td className="p-2.5">
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
                            <td className="p-2.5">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <span>{row.data.name}</span>
                                {row.data.isControlledSubstance && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive text-destructive font-bold">
                                    Rx
                                  </Badge>
                                )}
                              </div>
                              {row.data.genericName ? (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Pill className="size-3 text-primary/70 shrink-0" />
                                  <span>{row.data.genericName}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground/60 italic">No salt mapped</div>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="font-mono text-[11px] font-semibold text-foreground">
                                {row.data.category}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Unit: <span className="font-semibold">{row.data.unit}</span>
                              </div>
                            </td>
                            <td className="p-2.5">
                              {row.data.manufacturer ? (
                                <div className="text-[11px] text-foreground font-medium flex items-center gap-1">
                                  <Building2 className="size-3 text-muted-foreground shrink-0" />
                                  <span>{row.data.manufacturer}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground italic">-</div>
                              )}
                              {row.data.rackNumber && (
                                <div className="text-[10px] text-primary font-semibold flex items-center gap-1 mt-0.5">
                                  <MapPin className="size-3 shrink-0" />
                                  <span>{row.data.rackNumber}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-bold text-foreground">
                              PKR {row.data.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center font-bold text-xs">
                              {row.data.initialStockQuantity ? row.data.initialStockQuantity : '-'}
                            </td>
                            <td className="p-2.5">
                              {row.data.batchNumber ? (
                                <div className="font-mono text-[11px] font-medium text-foreground">
                                  {row.data.batchNumber}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Auto-gen</span>
                              )}
                              {row.data.expiryDate && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="size-3 text-muted-foreground shrink-0" />
                                  <span>Exp: {row.data.expiryDate}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-primary">
                                <Eye className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inline Detail Inspector & Fixer Side Card */}
                {selectedRow && (
                  <Card className="p-4 bg-background border-border/80 space-y-4 shadow-md rounded-xl flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <Edit3 className="size-4 text-primary" />
                          <h4 className="text-xs font-bold text-foreground">Inspect Row #{selectedRow.rowNumber}</h4>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRow(null)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>

                      {selectedRow.errors.length > 0 && (
                        <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-[11px] text-destructive font-semibold space-y-1">
                          <div className="flex items-center gap-1">
                            <ShieldAlert className="size-3.5" /> Validation Issue:
                          </div>
                          <ul className="list-disc list-inside">
                            {selectedRow.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <Label className="text-[11px] font-semibold text-muted-foreground">Product Trade Name</Label>
                          <Input
                            type="text"
                            value={selectedRow.data.name}
                            onChange={(e) => handleUpdateRowData(selectedRow.rowNumber, 'name', e.target.value)}
                            className="h-8 text-xs bg-background mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-muted-foreground">Generic / Salt Formula</Label>
                          <Input
                            type="text"
                            value={selectedRow.data.genericName || ''}
                            onChange={(e) => handleUpdateRowData(selectedRow.rowNumber, 'genericName', e.target.value)}
                            className="h-8 text-xs bg-background mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">Selling Price (PKR)</Label>
                            <Input
                              type="number"
                              value={selectedRow.data.unitPrice}
                              onChange={(e) => handleUpdateRowData(selectedRow.rowNumber, 'unitPrice', Number(e.target.value))}
                              className="h-8 text-xs bg-background mt-1 font-mono"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">Cost Price (PKR)</Label>
                            <Input
                              type="number"
                              value={selectedRow.data.costPrice ?? ''}
                              onChange={(e) => handleUpdateRowData(selectedRow.rowNumber, 'costPrice', e.target.value ? Number(e.target.value) : undefined)}
                              className="h-8 text-xs bg-background mt-1 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">Manufacturer</Label>
                            <Input
                              type="text"
                              value={selectedRow.data.manufacturer || ''}
                              onChange={(e) => handleUpdateRowData(selectedRow.rowNumber, 'manufacturer', e.target.value)}
                              className="h-8 text-xs bg-background mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">Rack / Shelf Location</Label>
                            <Input
                              type="text"
                              value={selectedRow.data.rackNumber || ''}
                              onChange={(e) => handleUpdateRowData(selectedRow.rowNumber, 'rackNumber', e.target.value)}
                              className="h-8 text-xs bg-background mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Status:</span>
                      {selectedRow.status === 'VALID' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-700 font-bold">Valid & Fixed</Badge>
                      ) : (
                        <Badge variant="destructive" className="font-bold">Invalid</Badge>
                      )}
                    </div>
                  </Card>
                )}
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
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
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
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
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

