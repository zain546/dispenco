import { z } from 'zod';

const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
  z.number().positive().optional()
);

const optionalInt = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
  z.number().int().positive().optional()
);

const optionalNonNegativeInt = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
  z.number().int().min(0).optional()
);

export const tabletCapsuleAttributesSchema = z.object({
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  packSize: optionalInt,
  stripCount: optionalNonNegativeInt,
  manufacturer: z.string().optional(),
  prescriptionRequired: z.boolean().optional(),
}).passthrough();

export type TabletCapsuleAttributes = z.infer<typeof tabletCapsuleAttributesSchema>;

export const syrupLiquidAttributesSchema = z.object({
  volumeMl: optionalNumber,
  flavor: z.string().optional(),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  prescriptionRequired: z.boolean().optional(),
}).passthrough();

export type SyrupLiquidAttributes = z.infer<typeof syrupLiquidAttributesSchema>;

export const injectionInfusionAttributesSchema = z.object({
  volumeMl: optionalNumber,
  route: z.string().optional(),
  storageTemp: z.string().optional(),
  manufacturer: z.string().optional(),
  prescriptionRequired: z.boolean().optional(),
}).passthrough();

export type InjectionInfusionAttributes = z.infer<typeof injectionInfusionAttributesSchema>;

export const medicalDeviceAttributesSchema = z.object({
  modelNumber: z.string().optional(),
  warrantyMonths: optionalNonNegativeInt,
  powerSource: z.string().optional(),
  manufacturer: z.string().optional(),
}).passthrough();

export type MedicalDeviceAttributes = z.infer<typeof medicalDeviceAttributesSchema>;

export const cosmeticsPersonalCareAttributesSchema = z.object({
  volumeMl: optionalNumber,
  weightGrams: optionalNumber,
  skinType: z.string().optional(),
  manufacturer: z.string().optional(),
}).passthrough();

export type CosmeticsPersonalCareAttributes = z.infer<typeof cosmeticsPersonalCareAttributesSchema>;

export const generalItemAttributesSchema = z.object({
  brand: z.string().optional(),
  description: z.string().optional(),
}).passthrough();

export type GeneralItemAttributes = z.infer<typeof generalItemAttributesSchema>;

export const categoryAttributeSchemaMap: Record<string, z.ZodSchema> = {
  TABLET_CAPSULE: tabletCapsuleAttributesSchema,
  SYRUP_LIQUID: syrupLiquidAttributesSchema,
  INJECTION_INFUSION: injectionInfusionAttributesSchema,
  MEDICAL_DEVICE: medicalDeviceAttributesSchema,
  COSMETICS_PERSONAL_CARE: cosmeticsPersonalCareAttributesSchema,
  GENERAL_ITEM: generalItemAttributesSchema,
};

export function validateProductAttributes(category: string, attributes: unknown) {
  const schema = categoryAttributeSchemaMap[category] || generalItemAttributesSchema;
  return schema.safeParse(attributes);
}
