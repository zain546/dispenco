import { apiClient } from '@/lib/api';

export interface CsvPreviewRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID';
  data: {
    name: string;
    genericName?: string;
    category: string;
    unit: string;
    unitPrice: number;
    costPrice?: number;
    barcode?: string;
    initialStockQuantity?: number;
    batchNumber?: string;
    expiryDate?: string;
    isPriority?: boolean;
  };
  errors: string[];
}

export interface CsvParseResult {
  success: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    headers: string[];
  };
  preview: CsvPreviewRow[];
}

export interface ConfirmImportRequest {
  products: Array<{
    name: string;
    genericName?: string;
    category?: string;
    unit?: string;
    unitPrice: number;
    costPrice?: number;
    barcode?: string;
    initialStockQuantity?: number;
    batchNumber?: string;
    expiryDate?: string;
    isPriority?: boolean;
  }>;
}

export const importApi = {
  parseCsv: async (
    csvContent: string,
    columnMapping?: Record<string, string>,
  ): Promise<CsvParseResult> => {
    const res = await apiClient.post<CsvParseResult>('/products/import/parse', {
      csvContent,
      columnMapping,
    });
    return res.data;
  },

  confirmImport: async (
    products: ConfirmImportRequest['products'],
  ): Promise<{ success: boolean; message: string; importedCount: number }> => {
    const res = await apiClient.post<{ success: boolean; message: string; importedCount: number }>(
      '/products/import/confirm',
      { products },
    );
    return res.data;
  },
};
