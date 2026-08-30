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
  lowStockThreshold: z.coerce.number().min(0, 'Threshold must be 0 or greater').default(10),

  // Mandatory Initial Stock & Pricing Fields (MediStock style)
  initialStockQuantity: z.coerce.number().optional(),
  expiryDate: z.string().optional(),
  costPrice: z.coerce.number().optional(),
  sellPrice: z.coerce.number().optional(),

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
  packSize: z.coerce.number().optional(),
  manufacturer: z.string().optional(),
  volumeMl: z.coerce.number().optional(),
  flavor: z.string().optional(),
  route: z.string().optional(),
  storageTemp: z.string().optional(),
  modelNumber: z.string().optional(),
  warrantyMonths: z.coerce.number().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
