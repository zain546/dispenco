'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  reportsApi,
  SalesReportResponse,
  GetSalesReportParams,
  OrgOverviewResponse,
} from '../services/reports-api';
import {
  downloadSalesReportPdf,
  shareSalesReportOnWhatsApp,
} from '../utils/sales-report-pdf';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/format';
import { salesApi, SaleDetailResponse } from '@/features/sales/services/sales-api';
import { downloadThermalReceiptPdf, downloadA4TaxInvoicePdf } from '@/features/sales/utils/invoice-pdf-generator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  Sparkles,
  BarChart3,
  Layers,
  Trophy,
  ShieldAlert,
  AlertOctagon,
  FileDown,
  Wallet,
  Receipt,
  Search,
  Loader2,
  Smartphone,
  CreditCard,
  Banknote,
  User,
  Stethoscope,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  RotateCcw,
  ArrowUpDown,
  Check,
} from 'lucide-react';
const AnalyticsCopilotView = dynamic(
  () => import('./analytics-copilot-view').then((m) => m.AnalyticsCopilotView),
  { ssr: false },
);
const AuditComplianceView = dynamic(
  () => import('./audit-compliance-view').then((m) => m.AuditComplianceView),
  { ssr: false },
);
const AnomaliesReviewView = dynamic(
  () => import('./anomalies-review-view').then((m) => m.AnomaliesReviewView),
  { ssr: false },
);
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from 'recharts';


function getReceiptPaymentBadge(method: string) {
  const m = (method || '').toUpperCase();
  if (m.includes('RETURNED')) {
    return (
      <Badge variant="destructive" className="text-micro font-medium gap-1 whitespace-nowrap">
        Returned
      </Badge>
    );
  }
  if (m === 'DIGITAL') {
    return (
      <Badge variant="outline" className="text-micro font-medium gap-1 border-primary/30 text-primary bg-primary/5 whitespace-nowrap">
        <Smartphone className="size-2.5" />
        Digital
      </Badge>
    );
  }
  if (m === 'CREDIT') {
    return (
      <Badge variant="outline" className="text-micro font-medium gap-1 border-warning/30 text-warning bg-warning/5 whitespace-nowrap">
        <CreditCard className="size-2.5" />
        Khata
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-micro font-medium gap-1 whitespace-nowrap">
      <Banknote className="size-2.5 text-muted-foreground" />
      Cash
    </Badge>
  );
}

type PresetRange = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

const PRESET_OPTIONS: Array<{ key: PresetRange; label: string; desktopOnly?: boolean }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday', desktopOnly: true },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

function WhatsAppIcon({ className = 'size-3.5 shrink-0' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ReportsView() {
  const { activeStoreId, activeStore, isAllStores, setActiveStoreId, isStoreReady } = useStore();
  const { user } = useAuth();
  const [preset, setPreset] = useState<PresetRange>('30d');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportResponse['data'] | null>(null);
  const [orgOverviewData, setOrgOverviewData] = useState<OrgOverviewResponse['data'] | null>(null);
  const [activeTab, setActiveTab] = useState<'quantity' | 'revenue'>('revenue');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [currentView, setCurrentView] = useState<'charts' | 'copilot' | 'audit' | 'integrity'>('charts');
  const [bottomSectionTab, setBottomSectionTab] = useState<'receipts' | 'medicines'>('receipts');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptPage, setReceiptPage] = useState(1);
  const receiptsPerPage = 15;
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicinePage, setMedicinePage] = useState(1);
  const medicinesPerPage = 15;
  const [downloadingSaleId, setDownloadingSaleId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<'all' | 'CASH' | 'DIGITAL' | 'CREDIT' | 'RETURNED'>('all');
  const [doctorFilter, setDoctorFilter] = useState<'all' | 'prescribed'>('all');
  const [receiptSort, setReceiptSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const [selectedReceiptIdForModal, setSelectedReceiptIdForModal] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleDetailResponse | null>(null);
  const [loadingSaleDetail, setLoadingSaleDetail] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [modalPdfLoading, setModalPdfLoading] = useState(false);
  const activeReceiptRequestIdRef = useRef<string | null>(null);

  const handleOpenReceiptModal = async (saleId: string) => {
    activeReceiptRequestIdRef.current = saleId;
    setSelectedReceiptIdForModal(saleId);
    setSaleDetail(null);
    setIsReceiptModalOpen(true);
    setLoadingSaleDetail(true);
    try {
      const res = await salesApi.getSaleById(saleId);
      if (activeReceiptRequestIdRef.current !== saleId) return;
      if (res?.success && res.sale) {
        setSaleDetail(res.sale);
      } else {
        toast.error('Could not load receipt details');
      }
    } catch (err) {
      if (activeReceiptRequestIdRef.current !== saleId) return;
      toast.error('Failed to load receipt details', {
        description: getErrorMessage(err),
      });
    } finally {
      if (activeReceiptRequestIdRef.current === saleId) {
        setLoadingSaleDetail(false);
      }
    }
  };

  const handleDownloadModalThermal = async () => {
    if (!saleDetail) return;
    try {
      setModalPdfLoading(true);
      await downloadThermalReceiptPdf(saleDetail, saleDetail.store?.name);
    } catch (err) {
      toast.error('Failed to download thermal receipt', { description: getErrorMessage(err) });
    } finally {
      setModalPdfLoading(false);
    }
  };

  const handleDownloadModalA4 = async () => {
    if (!saleDetail) return;
    try {
      setModalPdfLoading(true);
      await downloadA4TaxInvoicePdf(saleDetail, {
        storeName: saleDetail.store?.name ?? undefined,
        address: saleDetail.store?.address ?? undefined,
        dslNumber: (saleDetail.store as any)?.dslNumber ?? undefined,
        ntn: (saleDetail.store as any)?.ntn ?? undefined,
        phone: (saleDetail.store as any)?.phone ?? undefined,
      });
    } catch (err) {
      toast.error('Failed to download A4 tax invoice', { description: getErrorMessage(err) });
    } finally {
      setModalPdfLoading(false);
    }
  };

  const handleDownloadReceipt = async (saleId: string) => {
    try {
      setDownloadingSaleId(saleId);
      toast.loading('Fetching receipt details...', { id: `report-download-${saleId}` });
      const res = await salesApi.getSaleById(saleId);
      if (res?.success && res.sale) {
        toast.loading('Generating receipt PDF...', { id: `report-download-${saleId}` });
        await downloadThermalReceiptPdf(res.sale, res.sale.store?.name);
        toast.success(`Receipt #${res.sale.receiptNumber} downloaded!`, { id: `report-download-${saleId}` });
      } else {
        toast.error('Could not load receipt data', { id: `report-download-${saleId}` });
      }
    } catch (err) {
      console.error('Failed to download receipt:', err);
      toast.error('Failed to download receipt PDF', { id: `report-download-${saleId}` });
    } finally {
      setDownloadingSaleId(null);
    }
  };


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'copilot' || tabParam === 'ai' || tabParam === 'assistant') {
        setCurrentView('copilot');
      } else if (tabParam === 'audit' || tabParam === 'compliance') {
        setCurrentView('audit');
      } else if (tabParam === 'integrity' || tabParam === 'anomalies' || tabParam === 'shrinkage') {
        setCurrentView('integrity');
      } else if (tabParam === 'receipts' || tabParam === 'sales') {
        setCurrentView('charts');
        setBottomSectionTab('receipts');
        setTimeout(() => {
          const el = document.getElementById('sales-receipts-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      } else if (window.location.hash.includes('sales-receipts')) {
        setBottomSectionTab('receipts');
      }
    }
  }, []);

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const calculateDateRange = (selectedPreset: PresetRange) => {
    const end = new Date();
    const start = new Date();

    if (selectedPreset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (selectedPreset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        startStr: toLocalDateStr(yesterday),
        endStr: toLocalDateStr(yesterday),
      };
    } else if (selectedPreset === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (selectedPreset === '30d') {
      start.setDate(end.getDate() - 30);
    } else if (selectedPreset === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return {
      startStr: toLocalDateStr(start),
      endStr: toLocalDateStr(end),
    };
  };

  const getPresetLabel = (p: PresetRange): string => {
    switch (p) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case 'month':
        return 'This Month';
      case 'custom':
        return 'Custom Range';
    }
  };

  const reportReqVersionRef = useRef(0);

  const fetchReport = async () => {
    const reqVersion = ++reportReqVersionRef.current;
    try {
      setLoading(true);
      const params: GetSalesReportParams = { groupBy };

      if (preset !== 'custom') {
        const { startStr, endStr } = calculateDateRange(preset);
        params.startDate = startStr;
        params.endDate = endStr;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      if (!isAllStores && activeStoreId) {
        params.storeId = activeStoreId;
      }

      const [salesResult, orgResult] = await Promise.allSettled([
        reportsApi.getSalesReport(params),
        isAllStores
          ? reportsApi.getOrgOverview({
              startDate: params.startDate,
              endDate: params.endDate,
            })
          : Promise.resolve(null),
      ]);

      if (reqVersion !== reportReqVersionRef.current) return;

      if (salesResult.status === 'fulfilled') {
        if (salesResult.value?.success) {
          setReportData(salesResult.value.data);
        }
      } else {
        toast.error('Failed to load sales analytics', {
          description: getErrorMessage(salesResult.reason),
        });
      }

      if (orgResult.status === 'rejected') {
        toast.error('Failed to load organization overview', {
          description: getErrorMessage(orgResult.reason),
        });
      }

      if (isAllStores && orgResult.status === 'fulfilled' && orgResult.value?.success) {
        setOrgOverviewData(orgResult.value.data);
      } else if (!isAllStores) {
        setOrgOverviewData(null);
      }
    } catch (err) {
      if (reqVersion !== reportReqVersionRef.current) return;
      toast.error('Failed to load sales analytics', {
        description: getErrorMessage(err),
      });
    } finally {
      if (reqVersion === reportReqVersionRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isStoreReady) return;
    void fetchReport();
  }, [preset, groupBy, activeStoreId, isAllStores, isStoreReady]);

  const handleApplyCustomDates = () => {
    if (preset === 'custom') {
      fetchReport();
    }
  };

  const getPdfOptions = () => {
    if (!reportData) return null;
    const range =
      preset !== 'custom'
        ? calculateDateRange(preset)
        : {
            startStr: startDate || reportData.summary.dateRange.startDate.split('T')[0],
            endStr: endDate || reportData.summary.dateRange.endDate.split('T')[0],
          };

    return {
      reportData,
      storeName: isAllStores
        ? 'All Pharmacy Branches'
        : activeStore?.name || 'Dispenco Pharmacy',
      storeAddress: isAllStores ? 'Organization-Wide Consolidated Report' : activeStore?.address,
      periodLabel: getPresetLabel(preset),
      startDate: range.startStr,
      endDate: range.endStr,
      preparedBy: user?.name || 'Pharmacy Staff',
      orgStores: isAllStores ? orgOverviewData?.stores : undefined,
    };
  };

  const handleDownloadPdf = async () => {
    const opts = getPdfOptions();
    if (!opts) {
      toast.error('Report data is still loading');
      return;
    }
    try {
      await downloadSalesReportPdf(opts);
      toast.success(`Downloaded ${opts.periodLabel} Sales & Profit PDF Report`);
    } catch (err) {
      toast.error('Failed to generate PDF report', {
        description: getErrorMessage(err),
      });
    }
  };

  const handleShareWhatsApp = async () => {
    const opts = getPdfOptions();
    if (!opts) {
      toast.error('Report data is still loading');
      return;
    }
    try {
      await shareSalesReportOnWhatsApp(opts);
    } catch (err) {
      toast.error('Failed to share report on WhatsApp', {
        description: getErrorMessage(err),
      });
    }
  };

  const summary = reportData?.summary;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalCost = summary?.totalCost ?? 0;
  const totalProfit =
    summary?.totalProfit !== undefined ? summary.totalProfit : totalRevenue - totalCost;
  const profitMargin =
    summary?.profitMargin !== undefined
      ? summary.profitMargin
      : totalRevenue > 0
        ? Number(((totalProfit / totalRevenue) * 100).toFixed(1))
        : 0;

  const salesOverTime = reportData?.salesOverTime || [];
  
  const transactions = reportData?.transactions || [];

  const methodCounts = useMemo(() => {
    const counts = { all: transactions.length, cash: 0, digital: 0, credit: 0, returned: 0 };
    for (const tx of transactions) {
      const m = (tx.paymentMethod || '').toUpperCase();
      if (m.includes('RETURN')) {
        counts.returned++;
      } else if (m.includes('DIGITAL')) {
        counts.digital++;
      } else if (m.includes('CREDIT')) {
        counts.credit++;
      } else {
        counts.cash++;
      }
    }
    return counts;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!transactions.length) return [];
    let list = transactions;

    if (receiptSearch.trim()) {
      const q = receiptSearch.toLowerCase().trim();
      list = list.filter(
        (tx) =>
          (tx.receiptNumber && tx.receiptNumber.toLowerCase().includes(q)) ||
          (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
          (tx.doctorName && tx.doctorName.toLowerCase().includes(q)) ||
          (tx.cashierName && tx.cashierName.toLowerCase().includes(q)) ||
          (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(q))
      );
    }

    if (methodFilter !== 'all') {
      list = list.filter((tx) => {
        const m = (tx.paymentMethod || '').toUpperCase();
        if (methodFilter === 'RETURNED') return m.includes('RETURN');
        if (methodFilter === 'DIGITAL') return !m.includes('RETURN') && m.includes('DIGITAL');
        if (methodFilter === 'CREDIT') return !m.includes('RETURN') && m.includes('CREDIT');
        if (methodFilter === 'CASH') return !m.includes('RETURN') && !m.includes('DIGITAL') && !m.includes('CREDIT');
        return true;
      });
    }

    if (doctorFilter === 'prescribed') {
      list = list.filter(
        (tx) =>
          tx.doctorName &&
          tx.doctorName.trim().toLowerCase() !== 'self' &&
          tx.doctorName.trim().toLowerCase() !== 'walk-in'
      );
    }

    return [...list].sort((a, b) => {
      if (receiptSort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (receiptSort === 'highest') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      }
      if (receiptSort === 'lowest') {
        return (a.totalAmount || 0) - (b.totalAmount || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [transactions, receiptSearch, methodFilter, doctorFilter, receiptSort]);

  const totalReceiptPages = Math.max(1, Math.ceil(filteredTransactions.length / receiptsPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (receiptPage - 1) * receiptsPerPage,
    receiptPage * receiptsPerPage
  );

  const topProducts =
    activeTab === 'revenue'
      ? reportData?.topProductsByRevenue || []
      : reportData?.topProductsByQuantity || [];

  const filteredMedicines = useMemo(() => {
    if (!topProducts.length) return [];
    if (!medicineSearch.trim()) return topProducts;
    const q = medicineSearch.toLowerCase().trim();
    return topProducts.filter(
      (item) =>
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().replace(/_/g, ' ').includes(q))
    );
  }, [topProducts, medicineSearch]);

  const totalMedicinePages = Math.max(1, Math.ceil(filteredMedicines.length / medicinesPerPage));
  const paginatedMedicines = filteredMedicines.slice(
    (medicinePage - 1) * medicinesPerPage,
    medicinePage * medicinesPerPage
  );

  const headerInfo = {
    charts: {
      title: 'Sales & Profit',
      description: 'Revenue performance, profit margins, and PDF handover reports.',
    },
    copilot: {
      title: 'AI Analytics Copilot',
      description:
        'Natural-language queries and automated executive analytics backed by your real live database.',
    },
    audit: {
      title: 'Compliance & Audit Log',
      description:
        'Official inspection-ready records of all sensitive inventory, financial, and operational modifications.',
    },
    integrity: {
      title: 'Operational Integrity & Discrepancies',
      description:
        'Continuous statistical variance monitoring across cash registers, discounts, and inventory shrinkage.',
    },
  }[currentView];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <PageHeader
        title={headerInfo.title}
        description={headerInfo.description}
        badge={
          <Badge
            variant={isAllStores ? 'secondary' : 'outline'}
            className="text-xs font-medium bg-primary/10 text-primary border-primary/25"
          >
            {isAllStores ? 'All Branches' : activeStore?.name || 'Active Branch'}
          </Badge>
        }
        actions={
          currentView === 'charts' ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={loading || !reportData}
                className="flex-1 sm:flex-initial h-9 px-3.5 gap-1.5 text-xs font-semibold whitespace-nowrap shadow-2xs cursor-pointer justify-center"
              >
                <FileDown className="size-3.5 shrink-0" />
                <span>Export PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                disabled={loading || !reportData}
                className="flex-1 sm:flex-initial h-9 px-3.5 gap-1.5 text-xs font-semibold whitespace-nowrap border-success/30 bg-success/10 text-success hover:bg-success/20 shadow-2xs cursor-pointer justify-center"
              >
                <WhatsAppIcon className="size-3.5 shrink-0" />
                <span>WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchReport}
                disabled={loading}
                className="size-9 shrink-0 bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs cursor-pointer"
                title="Refresh report data"
              >
                <RefreshCw className={`size-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* View Switcher: Standard Reports vs AI Copilot vs Audit & Compliance */}
      <div className="border-b border-border pb-2">
        <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none">
          <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border/60 rounded-xl w-max">
            <Button
              variant={currentView === 'charts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('charts')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'charts'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="size-3.5 sm:size-4 shrink-0" />
              <span>Sales &amp; Profit</span>
            </Button>
            <Button
              variant={currentView === 'copilot' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('copilot')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'copilot'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="size-3.5 sm:size-4 shrink-0" />
              <span>AI Copilot</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-bold ml-0.5 ${
                  currentView === 'copilot'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-primary/10 text-primary border-primary/25'
                }`}
              >
                AI
              </Badge>
            </Button>
            <Button
              variant={currentView === 'audit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('audit')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'audit'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="size-3.5 sm:size-4 shrink-0" />
              <span>Audit Log</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-semibold ml-0.5 ${
                  currentView === 'audit'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                Inspection
              </Badge>
            </Button>
            <Button
              variant={currentView === 'integrity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('integrity')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'integrity'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertOctagon className="size-3.5 sm:size-4 shrink-0" />
              <span>Integrity</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-semibold ml-0.5 ${
                  currentView === 'integrity'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                Variance
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {currentView === 'copilot' ? (
        <AnalyticsCopilotView />
      ) : currentView === 'audit' ? (
        <AuditComplianceView />
      ) : currentView === 'integrity' ? (
        <AnomaliesReviewView />
      ) : (
        <>
          {/* Date Range & Filter Controls */}
          <Card className="border-border/60 shadow-2xs">
            <CardContent className="p-3 sm:p-4 space-y-2.5">
              {/* Presets Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" /> Date Range
                </span>
                <div className="grid grid-cols-5 sm:flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl w-full sm:w-auto">
                  {PRESET_OPTIONS.map((item) => (
                    <Button
                      key={item.key}
                      variant={preset === item.key ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreset(item.key)}
                      className={`h-7 text-[11px] sm:text-xs px-1.5 sm:px-3 font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
                        item.desktopOnly ? 'hidden sm:inline-flex' : ''
                      } ${
                        preset === item.key
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs if 'custom' preset */}
              {preset === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs w-full sm:w-36"
                  />
                  <span className="text-xs text-muted-foreground hidden sm:inline">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-full sm:w-36"
                  />
                  <Button
                    size="sm"
                    onClick={handleApplyCustomDates}
                    className="h-8 text-xs font-bold w-full sm:w-auto"
                  >
                    Apply Range
                  </Button>
                </div>
              )}

              {/* Frequency Grouping Row */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Filter className="size-3.5 text-primary" /> Group By
                </span>
                <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl">
                  {(['day', 'week', 'month'] as const).map((g) => (
                    <Button
                      key={g}
                      variant={groupBy === g ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setGroupBy(g)}
                      className={`h-7 text-xs px-2.5 capitalize font-semibold rounded-lg cursor-pointer ${
                        groupBy === g
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary KPI Cards (Now includes Net Profit & Margin!) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              caption="Gross completed sales"
              icon={DollarSign}
              variant="success"
              isLoading={loading}
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(totalProfit)}
              caption={`${profitMargin.toFixed(1)}% margin • Purchasing Cost: ${formatCurrency(totalCost)}`}
              icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
              variant={totalProfit >= 0 ? 'success' : 'destructive'}
              isLoading={loading}
            />
            <StatCard
              title="Completed Sales"
              value={formatNumber(summary?.totalTransactions ?? 0)}
              caption="Total receipts generated"
              icon={ShoppingCart}
              isLoading={loading}
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(summary?.averageOrderValue ?? 0)}
              caption="Average spend per sale"
              icon={Wallet}
              isLoading={loading}
            />
            <StatCard
              title="Items Dispensed"
              value={formatNumber(summary?.totalItemsSold ?? 0)}
              caption="Medicine units sold"
              icon={Package}
              isLoading={loading}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* Multi-Branch Comparative Performance Card */}
          {isAllStores && orgOverviewData && orgOverviewData.stores.length > 0 && (
            <Card className="border-border/60 shadow-xs overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Building2 className="size-4 text-primary" />
                      <span>Branch-by-Branch Comparative Matrix</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sales revenue, net profit, and stock inventory across all registered pharmacy branches
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium w-fit">
                    {orgOverviewData.stores.length} Active {orgOverviewData.stores.length === 1 ? 'Branch' : 'Branches'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[760px]">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-overline border-y border-border/60">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Store / Branch</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Revenue</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Net Profit</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Margin</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Share (%)</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Receipts</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Items Sold</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Stocked Items</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {orgOverviewData.stores.map((s) => {
                        const sProfit =
                          s.totalProfit !== undefined
                            ? s.totalProfit
                            : s.totalRevenue - (s.totalCost ?? 0);
                        const sMargin =
                          s.profitMargin !== undefined
                            ? s.profitMargin
                            : s.totalRevenue > 0
                              ? Number(((sProfit / s.totalRevenue) * 100).toFixed(1))
                              : 0;
                        return (
                          <tr key={s.storeId} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <Building2 className="size-3.5 text-primary shrink-0" />
                                <div>
                                  <span className="font-semibold block">{s.storeName}</span>
                                  <span className="text-micro text-muted-foreground">
                                    {s.address || 'Counter / Branch'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                              {formatCurrency(s.totalRevenue)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-success tabular-nums">
                              {formatCurrency(sProfit)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-muted-foreground tabular-nums">
                              {sMargin.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-semibold text-foreground tabular-nums">
                                  {s.revenueSharePercent}%
                                </span>
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, s.revenueSharePercent)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-foreground font-medium tabular-nums">
                              {formatNumber(s.totalTransactions)}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground tabular-nums">
                              {formatNumber(s.totalItemsSold)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              <Badge variant="outline" className="text-micro px-1.5 py-0 font-normal">
                                {formatNumber(s.uniqueProductsStocked)} Products (
                                {formatNumber(s.totalUnitsInStock)} Units)
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveStoreId(s.storeId)}
                                className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                              >
                                Focus Branch
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zero Store Branches Fallback for Org Overview */}
          {isAllStores && orgOverviewData && orgOverviewData.stores.length === 0 && (
            <Card className="border-border/60 shadow-2xs p-4">
              <EmptyState
                icon={Building2}
                title="No Active Store Branches Found"
                description="You do not have any registered active branches yet. Click on the store switcher in the header to register your first pharmacy branch."
              />
            </Card>
          )}

          {/* Main Revenue & Profit Chart Section */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Sales &amp; Profit Over Time
                </CardTitle>
                <CardDescription className="text-xs">
                  Revenue vs Net Profit trends grouped by {groupBy}
                </CardDescription>
              </div>

              <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl">
                <Button
                  variant={chartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className={`h-7 text-xs px-2.5 font-semibold rounded-lg cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Area
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className={`h-7 text-xs px-2.5 font-semibold rounded-lg cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-4">
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : salesOverTime.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Layers}
                    title="No sales recorded for this date range"
                    description="Complete sales at POS to generate revenue and profit analytics"
                  />
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickFormatter={(v) => `PKR ${v}`}
                        />
                        <Tooltip
                          formatter={(val: unknown, name?: unknown) => [
                            formatCurrency(Number(val || 0)),
                            name === 'profit' ? 'Net Profit' : 'Sales Revenue',
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            color: 'var(--popover-foreground)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === 'profit' ? 'Net Profit' : 'Sales Revenue')}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="revenue"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          name="profit"
                          stroke="var(--success)"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorProfit)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickFormatter={(v) => `PKR ${v}`}
                        />
                        <Tooltip
                          formatter={(val: unknown, name?: unknown) => [
                            formatCurrency(Number(val || 0)),
                            name === 'profit' ? 'Net Profit' : 'Sales Revenue',
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            color: 'var(--popover-foreground)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === 'profit' ? 'Net Profit' : 'Sales Revenue')}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        />
                        <Bar dataKey="revenue" name="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="profit" fill="var(--success)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Register & Payment Tender Reconciliation Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3.5 bg-card border border-border/70 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Cash in Drawer</span>
                <div className="size-6 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <Banknote className="size-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                  {formatCurrency(reportData?.summary?.paymentBreakdown?.cash?.amount ?? 0)}
                </div>
                <div className="text-micro text-muted-foreground mt-0.5">
                  {reportData?.summary?.paymentBreakdown?.cash?.count ?? 0} {reportData?.summary?.paymentBreakdown?.cash?.count === 1 ? 'sale' : 'sales'} collected
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-card border border-border/70 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Digital / Card</span>
                <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Smartphone className="size-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                  {formatCurrency(reportData?.summary?.paymentBreakdown?.digital?.amount ?? 0)}
                </div>
                <div className="text-micro text-muted-foreground mt-0.5">
                  {reportData?.summary?.paymentBreakdown?.digital?.count ?? 0} {reportData?.summary?.paymentBreakdown?.digital?.count === 1 ? 'sale' : 'sales'} processed
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-card border border-border/70 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Customer Khata (Credit)</span>
                <div className="size-6 rounded-md bg-warning/10 flex items-center justify-center text-warning">
                  <CreditCard className="size-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                  {formatCurrency(reportData?.summary?.paymentBreakdown?.credit?.amount ?? 0)}
                </div>
                <div className="text-micro text-muted-foreground mt-0.5">
                  {reportData?.summary?.paymentBreakdown?.credit?.count ?? 0} {reportData?.summary?.paymentBreakdown?.credit?.count === 1 ? 'receipt' : 'receipts'} debited
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-card border border-border/70 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Returns & Discounts</span>
                <div className="size-6 rounded-md bg-destructive/10 flex items-center justify-center text-destructive">
                  <RotateCcw className="size-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold text-destructive tabular-nums">
                  -{formatCurrency(reportData?.summary?.totalReturns ?? 0)}
                </div>
                <div className="text-micro text-muted-foreground mt-0.5">
                  Discounts: {formatCurrency(reportData?.summary?.totalDiscount ?? 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Dual Tab Card for Sales Receipts and Medicines Sold */}
          <Card id="sales-receipts-section" className="border-border/60 shadow-2xs">
            <CardHeader className="p-3.5 sm:p-6 flex flex-col gap-3.5 sm:gap-4 pb-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Segmented Switcher */}
                <div className="flex sm:inline-flex items-center gap-1 p-1 bg-muted/40 border border-border/70 rounded-xl w-full sm:w-auto">
                  <Button
                    variant={bottomSectionTab === 'receipts' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setBottomSectionTab('receipts')}
                    className={`flex-1 sm:flex-initial h-8 text-xs sm:text-sm px-2.5 sm:px-3.5 font-semibold rounded-lg cursor-pointer gap-1.5 sm:gap-2 justify-center whitespace-nowrap ${
                      bottomSectionTab === 'receipts'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Receipt className="size-3.5 sm:size-4 shrink-0" />
                    <span>Sales Receipts</span>
                    {transactions.length > 0 && (
                      <span
                        className={`text-micro px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                          bottomSectionTab === 'receipts'
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {transactions.length}
                      </span>
                    )}
                  </Button>

                  <Button
                    variant={bottomSectionTab === 'medicines' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setBottomSectionTab('medicines')}
                    className={`flex-1 sm:flex-initial h-8 text-xs sm:text-sm px-2.5 sm:px-3.5 font-semibold rounded-lg cursor-pointer gap-1.5 sm:gap-2 justify-center whitespace-nowrap ${
                      bottomSectionTab === 'medicines'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Trophy className="size-3.5 sm:size-4 shrink-0 text-warning" />
                    <span>Medicines Sold</span>
                    {topProducts.length > 0 && (
                      <span
                        className={`text-micro px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                          bottomSectionTab === 'medicines'
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {topProducts.length}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Contextual actions */}
                {bottomSectionTab === 'receipts' ? (
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search receipt #, customer, cashier, doctor..."
                        value={receiptSearch}
                        onChange={(e) => {
                          setReceiptSearch(e.target.value);
                          setReceiptPage(1);
                        }}
                        className="h-8 pl-8 pr-7 text-xs bg-muted/20 border-border/70 rounded-lg placeholder:text-muted-foreground"
                      />
                      {receiptSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptSearch('');
                            setReceiptPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-60">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search medicine, category..."
                        value={medicineSearch}
                        onChange={(e) => {
                          setMedicineSearch(e.target.value);
                          setMedicinePage(1);
                        }}
                        className="h-8 pl-8 pr-7 text-xs bg-muted/20 border-border/70 rounded-lg placeholder:text-muted-foreground"
                      />
                      {medicineSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setMedicineSearch('');
                            setMedicinePage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex sm:inline-flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl w-full sm:w-auto">
                      <Button
                        variant={activeTab === 'revenue' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setActiveTab('revenue');
                          setMedicinePage(1);
                        }}
                        className={`flex-1 sm:flex-initial h-7 text-xs px-2.5 sm:px-3 font-semibold rounded-lg cursor-pointer justify-center whitespace-nowrap ${
                          activeTab === 'revenue'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        By Revenue
                      </Button>
                      <Button
                        variant={activeTab === 'quantity' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setActiveTab('quantity');
                          setMedicinePage(1);
                        }}
                        className={`flex-1 sm:flex-initial h-7 text-xs px-2.5 sm:px-3 font-semibold rounded-lg cursor-pointer justify-center whitespace-nowrap ${
                          activeTab === 'quantity'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        By Quantity Sold
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Segmented Filter Row for Sales Receipts */}
              {bottomSectionTab === 'receipts' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border/60">
                  <span className="text-micro font-semibold text-muted-foreground mr-1 hidden sm:inline">Method:</span>
                  {(
                    [
                      { key: 'all', label: `All (${methodCounts.all})` },
                      { key: 'CASH', label: `Cash (${methodCounts.cash})` },
                      { key: 'DIGITAL', label: `Digital (${methodCounts.digital})` },
                      { key: 'CREDIT', label: `Khata (${methodCounts.credit})` },
                      { key: 'RETURNED', label: `Returns (${methodCounts.returned})` },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => {
                        setMethodFilter(chip.key);
                        setReceiptPage(1);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        methodFilter === chip.key
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}

                  <div className="hidden sm:block h-4 w-px bg-border/80 mx-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setDoctorFilter((curr) => (curr === 'prescribed' ? 'all' : 'prescribed'));
                      setReceiptPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      doctorFilter === 'prescribed'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                    }`}
                  >
                    <Stethoscope className="size-3" />
                    <span>Doctor Rx Only</span>
                  </button>

                  <div className="ml-auto flex items-center gap-1.5">
                    <Select value={receiptSort} onValueChange={(val) => setReceiptSort(val as any)}>
                      <SelectTrigger
                        size="sm"
                        className="h-8 px-2.5 text-xs font-medium gap-1.5 border-border/70 bg-muted/30 hover:bg-muted/50 text-foreground rounded-lg shadow-2xs cursor-pointer"
                      >
                        <ArrowUpDown className="size-3 text-primary" />
                        <SelectValue placeholder="Sort receipts" />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl border-border/80 shadow-lg text-xs">
                        <SelectItem value="newest" className="cursor-pointer">Newest First</SelectItem>
                        <SelectItem value="oldest" className="cursor-pointer">Oldest First</SelectItem>
                        <SelectItem value="highest" className="cursor-pointer">Highest Amount</SelectItem>
                        <SelectItem value="lowest" className="cursor-pointer">Lowest Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Sub-description */}
              <div className="text-xs text-muted-foreground">
                {bottomSectionTab === 'receipts' ? (
                  <span>
                    Showing {filteredTransactions.length} receipt{filteredTransactions.length === 1 ? '' : 's'} recorded in the selected period.
                  </span>
                ) : (
                  <span>
                    Showing {filteredMedicines.length} medicine{filteredMedicines.length === 1 ? '' : 's'} sold in the selected period with sales amount, purchasing cost, and profit.
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : bottomSectionTab === 'receipts' ? (
                filteredTransactions.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={Receipt}
                      title="No receipts found"
                      description={
                        receiptSearch
                          ? `No receipts matched "${receiptSearch}". Try clearing your search.`
                          : 'No sales transactions were recorded for the selected period.'
                      }
                      action={
                        receiptSearch ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReceiptSearch('');
                              setReceiptPage(1);
                            }}
                            className="mt-2 text-xs h-8 cursor-pointer"
                          >
                            Clear Search
                          </Button>
                        ) : undefined
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[980px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                            <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Receipt #</th>
                            <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Date &amp; Time</th>
                            <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Customer</th>
                            <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Cashier</th>
                            <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Doctor / Prescriber</th>
                            <th className="py-3 px-4 whitespace-nowrap min-w-[100px]">Method</th>
                            <th className="py-3 px-4 text-center whitespace-nowrap min-w-[85px]">Items</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap min-w-[100px]">Discount</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap min-w-[110px]">Amount</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap min-w-[110px]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {paginatedTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceiptModal(tx.id)}
                                  className="hover:text-primary transition-colors hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
                                  title="Quick view receipt details"
                                >
                                  <Receipt className="size-3.5 text-primary" />
                                  <span>{tx.receiptNumber}</span>
                                </button>
                              </td>

                              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                {formatDateTime(tx.createdAt)}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-medium text-foreground">
                                  <User className="size-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[140px]">
                                    {tx.customerName || 'Walk-in'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <User className="size-3.5 text-primary/70 shrink-0" />
                                  <span className="truncate max-w-[130px] font-medium text-foreground">
                                    {tx.cashierName || 'Staff'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Stethoscope className="size-3.5 text-muted-foreground/70 shrink-0" />
                                  <span className="truncate max-w-[130px] font-medium text-foreground/90">
                                    {tx.doctorName || 'Self'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                {getReceiptPaymentBadge(tx.paymentMethod)}
                              </td>

                              <td className="py-3 px-4 text-center tabular-nums text-muted-foreground font-medium whitespace-nowrap">
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted/60 text-micro font-medium whitespace-nowrap">
                                  {tx.itemsCount} {tx.itemsCount === 1 ? 'item' : 'items'}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                                {tx.discountAmount && tx.discountAmount > 0 ? (
                                  <span className="font-semibold text-success">
                                    -{formatCurrency(tx.discountAmount)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60">—</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums text-xs whitespace-nowrap">
                                {tx.paymentMethod?.includes('RETURNED') ? (
                                  <span className="line-through text-muted-foreground/75" title="Returned / Refunded">
                                    {formatCurrency(tx.totalAmount)}
                                  </span>
                                ) : (
                                  formatCurrency(tx.totalAmount)
                                )}
                              </td>

                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenReceiptModal(tx.id)}
                                    className="h-7 px-2 text-xs font-semibold gap-1 text-foreground border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
                                    title="Quick view receipt details"
                                  >
                                    <Eye className="size-3.5 text-primary" />
                                    <span className="hidden sm:inline">Inspect</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadReceipt(tx.id)}
                                    disabled={downloadingSaleId === tx.id}
                                    className="h-7 px-2 text-xs font-semibold gap-1 text-foreground border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
                                    title="Download receipt PDF"
                                  >
                                    {downloadingSaleId === tx.id ? (
                                      <Loader2 className="size-3.5 animate-spin text-primary" />
                                    ) : (
                                      <FileDown className="size-3.5 text-primary" />
                                    )}
                                    <span className="hidden sm:inline">Receipt</span>
                                  </Button>

                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                                    title="Open full receipt page in new tab"
                                  >
                                    <Link href={`/pos/receipt/${tx.id}`} target="_blank">
                                      <ExternalLink className="size-3.5" />
                                    </Link>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalReceiptPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
                        <div>
                          Showing {(receiptPage - 1) * receiptsPerPage + 1} to{' '}
                          {Math.min(receiptPage * receiptsPerPage, filteredTransactions.length)} of {filteredTransactions.length} receipts
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiptPage((p) => Math.max(1, p - 1))}
                            disabled={receiptPage <= 1}
                            className="h-7 px-2 text-xs cursor-pointer"
                          >
                            <ChevronLeft className="size-3.5" />
                            <span>Prev</span>
                          </Button>
                          <span className="px-2 font-medium text-foreground">
                            {receiptPage} / {totalReceiptPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiptPage((p) => Math.min(totalReceiptPages, p + 1))}
                            disabled={receiptPage >= totalReceiptPages}
                            className="h-7 px-2 text-xs cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : topProducts.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Trophy}
                    title="No medicines sold"
                    description="Sales data for the selected period will appear here once transactions are recorded."
                  />
                </div>
              ) : filteredMedicines.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Trophy}
                    title="No medicines found"
                    description={
                      medicineSearch
                        ? `No medicines matched "${medicineSearch}". Try clearing your search.`
                        : 'No medicines sold in the selected period.'
                    }
                    action={
                      medicineSearch ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMedicineSearch('');
                            setMedicinePage(1);
                          }}
                          className="mt-2 text-xs h-8 cursor-pointer"
                        >
                          Clear Search
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                          <th className="py-3 px-4 w-12 text-center whitespace-nowrap">#</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Medicine</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Category</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap min-w-[90px]">Qty Sold</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap min-w-[110px]">Total Sales</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap min-w-[110px]">Purchasing Cost</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap min-w-[100px]">Profit</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap min-w-[85px]">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {paginatedMedicines.map((item, index) => {
                          const rank = (medicinePage - 1) * medicinesPerPage + index + 1;
                          const itemCost = item.totalCost ?? 0;
                          const itemProfit =
                            item.totalProfit !== undefined
                              ? item.totalProfit
                              : item.totalRevenue - itemCost;
                          const itemMargin = item.totalRevenue > 0 ? (itemProfit / item.totalRevenue) * 100 : 0;

                          return (
                            <tr key={item.productId} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 text-center font-bold whitespace-nowrap">
                                {rank === 1 ? (
                                  <Badge
                                    variant="warning"
                                    className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro"
                                  >
                                    1
                                  </Badge>
                                ) : rank === 2 ? (
                                  <Badge
                                    variant="secondary"
                                    className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro"
                                  >
                                    2
                                  </Badge>
                                ) : rank === 3 ? (
                                  <Badge
                                    variant="outline"
                                    className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro"
                                  >
                                    3
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">{rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                                {item.productName}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <Badge variant="outline" className="text-micro font-normal capitalize whitespace-nowrap">
                                  {(item.category || 'General').replace(/_/g, ' ').toLowerCase()}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-foreground tabular-nums whitespace-nowrap">
                                {formatNumber(item.totalQuantity)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums whitespace-nowrap">
                                {formatCurrency(item.totalRevenue)}
                              </td>
                              <td className="py-3 px-4 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                                {formatCurrency(itemCost)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-success tabular-nums whitespace-nowrap">
                                {formatCurrency(itemProfit)}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-micro font-bold tabular-nums ${
                                    itemMargin >= 20
                                      ? 'bg-success/10 text-success'
                                      : itemMargin >= 0
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-destructive/10 text-destructive'
                                  }`}
                                >
                                  {itemMargin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar for Medicines */}
                  {totalMedicinePages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
                      <div>
                        Showing {(medicinePage - 1) * medicinesPerPage + 1} to{' '}
                        {Math.min(medicinePage * medicinesPerPage, filteredMedicines.length)} of {filteredMedicines.length} medicines
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMedicinePage((p) => Math.max(1, p - 1))}
                          disabled={medicinePage <= 1}
                          className="h-7 px-2 text-xs cursor-pointer"
                        >
                          <ChevronLeft className="size-3.5" />
                          <span>Prev</span>
                        </Button>
                        <span className="px-2 font-medium text-foreground">
                          {medicinePage} / {totalMedicinePages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMedicinePage((p) => Math.min(totalMedicinePages, p + 1))}
                          disabled={medicinePage >= totalMedicinePages}
                          className="h-7 px-2 text-xs cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* In-Place Receipt Quick View Inspection Dialog */}
      <Dialog
        open={isReceiptModalOpen}
        onOpenChange={(open) => {
          setIsReceiptModalOpen(open);
          if (!open) {
            activeReceiptRequestIdRef.current = null;
            setSaleDetail(null);
            setLoadingSaleDetail(false);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl sm:w-full max-h-[90vh] flex flex-col p-4 sm:p-6 bg-card text-foreground border-border overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border text-left pr-8 shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Receipt className="size-5 text-primary shrink-0" />
              <DialogTitle className="text-base sm:text-lg font-bold font-mono">
                {saleDetail?.receiptNumber ? `#${saleDetail.receiptNumber}` : 'Receipt Inspection'}
              </DialogTitle>
              {saleDetail && getReceiptPaymentBadge(saleDetail.payment?.method || saleDetail.status)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {saleDetail ? (
                <span>
                  Recorded on {formatDateTime(saleDetail.createdAt)} • {saleDetail.store?.name || 'Main Pharmacy'}
                </span>
              ) : (
                'Loading transaction details...'
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingSaleDetail ? (
            <div className="py-12 space-y-3">
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : saleDetail ? (
            <div className="space-y-4 pt-2 overflow-y-auto flex-1 min-h-0 custom-scrollbar pr-0.5">
              {/* Customer, Cashier, Doctor Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/70 text-xs">
                <div className="min-w-0">
                  <span className="text-micro text-muted-foreground block font-medium">Customer</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{saleDetail.customer?.name || 'Walk-in Customer'}</span>
                  </div>
                  {saleDetail.customer?.phone && (
                    <span className="text-micro text-muted-foreground block font-mono truncate">
                      {saleDetail.customer.phone}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-micro text-muted-foreground block font-medium">Cashier / Staff</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
                    <User className="size-3.5 text-primary/70 shrink-0" />
                    <span className="truncate">{saleDetail.user?.name || 'Staff'}</span>
                  </div>
                  {saleDetail.user?.email && (
                    <span className="text-micro text-muted-foreground block truncate">
                      {saleDetail.user.email}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-micro text-muted-foreground block font-medium">Prescriber / Doctor</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
                    <Stethoscope className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{saleDetail.doctorName || 'Self / OTC'}</span>
                  </div>
                  <span className="text-micro text-muted-foreground block truncate">
                    {saleDetail.doctorName ? 'Prescription Dispense' : 'Over The Counter'}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-border/70 rounded-xl overflow-hidden w-full bg-card">
                <div className="overflow-x-auto max-w-full custom-scrollbar">
                  <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                      <tr>
                        <th className="py-2.5 px-3">Item / Medicine</th>
                        <th className="py-2.5 px-3">Batch & Expiry</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Disc</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {saleDetail.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            <div>{item.productName}</div>
                            {item.genericName && (
                              <div className="text-micro text-muted-foreground truncate max-w-[180px]">
                                {item.genericName}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-micro text-muted-foreground">
                            <div>{item.batchNumber || '—'}</div>
                            {item.expiryDate && (
                              <div className="text-micro">{item.expiryDate.split('T')[0]}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-foreground">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {item.discount > 0 ? (
                              <span className="text-success font-medium">-{formatCurrency(item.discount)}</span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground tabular-nums">
                            {formatCurrency(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal:</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {formatCurrency(
                      saleDetail.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
                    )}
                  </span>
                </div>
                {saleDetail.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount Applied:</span>
                    <span className="tabular-nums font-semibold">
                      -{formatCurrency(saleDetail.discountAmount)}
                    </span>
                  </div>
                )}
                {saleDetail.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCurrency(saleDetail.taxAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-border pt-2 text-foreground">
                  <span>Net Paid Amount:</span>
                  <span className="tabular-nums text-primary text-base">
                    {formatCurrency(saleDetail.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Returns on this sale if any */}
              {saleDetail.returns && saleDetail.returns.length > 0 && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-xs space-y-1.5">
                  <div className="font-bold text-destructive flex items-center gap-1.5">
                    <RotateCcw className="size-3.5" />
                    <span>Return / Refund Issued</span>
                  </div>
                  {saleDetail.returns.map((ret) => (
                    <div key={ret.id} className="flex justify-between items-center text-micro">
                      <span>{ret.returnNumber} ({ret.itemsCount} items returned - {ret.reason})</span>
                      <span className="font-bold text-destructive">-{formatCurrency(ret.refundAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2 justify-between items-center shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadModalThermal}
                disabled={!saleDetail || loadingSaleDetail || modalPdfLoading}
                className="flex-1 sm:flex-initial h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Printer className="size-3.5 text-primary" />
                <span>Thermal Receipt</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadModalA4}
                disabled={!saleDetail || loadingSaleDetail || modalPdfLoading}
                className="flex-1 sm:flex-initial h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <FileDown className="size-3.5 text-primary" />
                <span>A4 Tax Invoice</span>
              </Button>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full sm:w-auto h-8 text-xs font-semibold cursor-pointer"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
