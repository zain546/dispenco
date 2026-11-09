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
  'Strip',
  'Bottle',
  'Vial',
  'Ampoule',
  'Piece',
  'Tube',
  'Sachet',
  'Kit',
] as const;

/**
 * Reusable preprocessor for optional numeric form inputs.
 * Gracefully coerces empty strings, null, or undefined to undefined while parsing valid numbers.
 */
function optionalNumber(min?: number, minMessage?: string) {
  let schema = z.number();
  if (min !== undefined && minMessage) {
    schema = schema.min(min, minMessage);
  }
  return z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
    schema.optional()
  );
}

export const productFormSchema = z.object({
  isEditing: z.boolean().optional(),
  name: z.string().min(2, 'Please enter a medicine name (at least 2 characters)'),
  genericName: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  unit: z.string().min(1, 'Please select a package unit (e.g. Box, Strip, Bottle)'),
  barcode: z.string().optional(),
  taxCode: z.string().optional(),
  isControlledSubstance: z.boolean(),
  lowStockThreshold: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? 10 : Number(v)),
    z.number().min(0, 'Low stock alert threshold cannot be negative')
  ),

  // Mandatory Initial Stock & Pricing Fields
  initialStockQuantity: optionalNumber(0, 'Stock quantity cannot be negative'),
  expiryDate: z.string().optional(),
  costPrice: optionalNumber(0, 'Purchase price cannot be negative'),
  sellPrice: optionalNumber(0, 'Retail price cannot be negative'),

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
  packSize: optionalNumber(1, 'Pack size must be at least 1'),
  manufacturer: z.string().optional(),
  volumeMl: optionalNumber(0, 'Volume cannot be negative'),
  flavor: z.string().optional(),
  route: z.string().optional(),
  storageTemp: z.string().optional(),
  modelNumber: z.string().optional(),
  warrantyMonths: optionalNumber(0, 'Warranty months cannot be negative'),
  weightGrams: optionalNumber(0, 'Weight cannot be negative'),
  skinType: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasStock = data.initialStockQuantity !== undefined && data.initialStockQuantity > 0;
  if (hasStock) {
    if (!data.expiryDate || !data.expiryDate.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiryDate'],
        message: 'Expiry date is required when adding stock',
      });
    }
    if (data.costPrice === undefined || data.costPrice === null || isNaN(data.costPrice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['costPrice'],
        message: 'Purchase price is required when adding stock',
      });
    }
    if (data.sellPrice === undefined || data.sellPrice === null || isNaN(data.sellPrice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sellPrice'],
        message: 'Retail price (MRP) is required when adding stock',
      });
    }
  }

  const parseLocalDate = (dateStr: string): Date | null => {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate manufacturing date
  let mfgDateObj: Date | null = null;
  if (data.mfgDate && data.mfgDate.trim()) {
    mfgDateObj = parseLocalDate(data.mfgDate);
    if (mfgDateObj && mfgDateObj > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mfgDate'],
        message: 'Manufacturing date cannot be in the future.',
      });
    }
  }

  // Ensure expiryDate is not in the past for new stock / new intake
  let expDateObj: Date | null = null;
  if (data.expiryDate && data.expiryDate.trim()) {
    expDateObj = parseLocalDate(data.expiryDate);
    if (expDateObj && !data.isEditing && expDateObj < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiryDate'],
        message: 'Expiry date cannot be in the past. Please select a valid future date.',
      });
    }
  }

  // Cross-field validation: mfgDate must be earlier than expiryDate
  if (mfgDateObj && expDateObj && mfgDateObj >= expDateObj) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mfgDate'],
      message: 'Manufacturing date must be earlier than the expiry date.',
    });
  }
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;
