import { apiClient } from '@/lib/api';

export type PrescriptionStatus =
  | 'ACTIVE'
  | 'DISPENSED'
  | 'PARTIALLY_DISPENSED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface PrescriptionItemData {
  id: string;
  prescriptionId: string;
  productId: string;
  dosage?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  instructions?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    genericName?: string | null;
    category: string;
    unit: string;
    isControlledSubstance: boolean;
    barcode?: string | null;
  };
}

export interface PrescriptionData {
  id: string;
  tenantId: string;
  storeId: string;
  prescriptionNumber: string;
  patientName: string;
  patientPhone?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  patientCnic?: string | null;
  doctorName: string;
  doctorLicenseNumber?: string | null;
  doctorHospital?: string | null;
  prescriptionDate: string;
  expiryDate?: string | null;
  imageReference?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  status: PrescriptionStatus;
  saleId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PrescriptionItemData[];
  store?: {
    id: string;
    name: string;
    address?: string | null;
  };
  sale?: {
    id: string;
    receiptNumber?: string | null;
    totalAmount: number;
    createdAt?: string;
  };
}

export interface CreatePrescriptionItemPayload {
  productId: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  quantityPrescribed: number;
  instructions?: string;
}

export interface CreatePrescriptionPayload {
  storeId: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  patientCnic?: string;
  doctorName: string;
  doctorLicenseNumber?: string;
  doctorHospital?: string;
  prescriptionDate?: string;
  expiryDate?: string;
  imageReference?: string;
  diagnosis?: string;
  notes?: string;
  status?: PrescriptionStatus;
  items: CreatePrescriptionItemPayload[];
}

export interface ScanPrescriptionOcrPayload {
  imageBase64: string;
  mimeType?: string;
  fileName?: string;
  storeId?: string;
  rawText?: string;
}

export interface ExtractedPrescriptionItem {
  rawMedicineName: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  genericName?: string | null;
  category?: string | null;
  unit?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  quantityPrescribed: number;
  instructions?: string | null;
  confidence: number;
  isControlledSubstance: boolean;
  isNewProduct: boolean;
}

export interface PrescriptionOcrResponse {
  success: boolean;
  ocrEngine: string;
  confidence: number;
  hasControlledSubstances: boolean;
  patient: {
    name: string;
    phone?: string | null;
    age?: number | null;
    gender?: string | null;
    cnic?: string | null;
  };
  doctor: {
    name: string;
    licenseNumber?: string | null;
    hospital?: string | null;
  };
  prescriptionDate: string;
  expiryDate?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  items: ExtractedPrescriptionItem[];
}

export const prescriptionsApi = {
  createPrescription: async (payload: CreatePrescriptionPayload) => {
    const res = await apiClient.post('/prescriptions', payload);
    return res.data;
  },

  scanPrescriptionOcr: async (payload: ScanPrescriptionOcrPayload): Promise<PrescriptionOcrResponse> => {
    const res = await apiClient.post('/prescriptions/ocr-scan', payload);
    return res.data;
  },

  getPrescriptions: async (params?: {
    storeId?: string;
    status?: PrescriptionStatus;
    search?: string;
    isControlledOnly?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.storeId) q.append('storeId', params.storeId);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.isControlledOnly) q.append('isControlledOnly', 'true');
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await apiClient.get(`/prescriptions${queryStr}`);
    return res.data;
  },

  getPrescriptionById: async (id: string) => {
    const res = await apiClient.get(`/prescriptions/${id}`);
    return res.data;
  },

  updatePrescription: async (id: string, payload: Partial<CreatePrescriptionPayload>) => {
    const res = await apiClient.patch(`/prescriptions/${id}`, payload);
    return res.data;
  },

  dispensePrescription: async (
    id: string,
    payload: {
      saleId?: string;
      notes?: string;
      items?: Array<{ itemId: string; quantityDispensed: number }>;
    },
  ) => {
    const res = await apiClient.post(`/prescriptions/${id}/dispense`, payload);
    return res.data;
  },
};
