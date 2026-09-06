import { z } from 'zod';

export const PRODUCT_CATEGORIES = [
  { value: 'TABLET_CAPSULE', label: 'Tablet / Capsule' },
  { value: 'SYRUP_LIQUID', label: 'Syrup / Liquid' },
  { value: 'INJECTION_INFUSION', label: 'Injection / Infusion' },
  { value: 'MEDICAL_DEVICE', label: 'Medical Device & Equipment' },
  { value: 'COSMETICS_PERSONAL_CARE', label: 'Cosmetics & Personal Care' },
  { value: 'GENERAL_ITEM', label: 'General OTC / Other' },
] as const;

export const PRODUCT_UNITS = [
  'Box',
  'Pack',
  'Strip',
  'Bottle',
  'Vial',
  'Ampoule',
  'Piece',
  'Tube',
  'Sachet',
  'Kit',
] as const;

export const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  genericName: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  unit: z.string().min(1, 'Please select or enter a unit of measure'),
  barcode: z.string().optional(),
  taxCode: z.string().optional(),
  isControlledSubstance: z.boolean().default(false),
  lowStockThreshold: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 10 : Number(v)),
    z.number().min(0, 'Threshold must be 0 or greater').default(10)
  ),

  // Mandatory Initial Stock & Pricing Fields
  initialStockQuantity: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    z.number().min(0, 'Stock quantity cannot be negative').optional()
  ),
  expiryDate: z.string().optional(),
  costPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    z.number().min(0, 'Purchase price cannot be negative').optional()
  ),
  sellPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    z.number().min(0, 'Retail price cannot be negative').optional()
  ),

  // Optional Batch, Invoice & Manufacturing Info
  batchNumber: z.string().optional(),
  rackNumber: z.string().optional(),
  vendorName: z.string().optional(),
  mfgDate: z.string().optional(),
  purchaseInvoiceNumber: z.string().optional(),
  purchaseInvoiceDate: z.string().optional(),

  // Dynamic category attributes
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  packSize: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    z.number().min(1, 'Pack size must be at least 1').optional()
  ),
  manufacturer: z.string().optional(),
  volumeMl: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    z.number().min(0, 'Volume cannot be negative').optional()
  ),
  flavor: z.string().optional(),
  route: z.string().optional(),
  storageTemp: z.string().optional(),
  modelNumber: z.string().optional(),
  warrantyMonths: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    z.number().min(0, 'Warranty months cannot be negative').optional()
  ),
  brand: z.string().optional(),
  description: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
