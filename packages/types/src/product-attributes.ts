import { z } from 'zod';

export const tabletCapsuleAttributesSchema = z.object({
  dosageForm: z.string().min(1, 'Dosage form is required'),
  strength: z.string().min(1, 'Strength is required'),
  packSize: z.number().int().positive('Pack size must be a positive integer'),
  stripCount: z.number().int().nonnegative().optional(),
  manufacturer: z.string().min(1, 'Manufacturer name is required'),
  prescriptionRequired: z.boolean().default(false),
});

export type TabletCapsuleAttributes = z.infer<typeof tabletCapsuleAttributesSchema>;

export const syrupLiquidAttributesSchema = z.object({
  volumeMl: z.number().positive('Volume in ML must be positive'),
  flavor: z.string().optional(),
  strength: z.string().optional(),
  manufacturer: z.string().min(1, 'Manufacturer name is required'),
  prescriptionRequired: z.boolean().default(false),
});

export type SyrupLiquidAttributes = z.infer<typeof syrupLiquidAttributesSchema>;

export const injectionInfusionAttributesSchema = z.object({
  volumeMl: z.number().positive().optional(),
  route: z.string().min(1, 'Administration route is required'),
  storageTemp: z.string().optional(),
  manufacturer: z.string().min(1, 'Manufacturer name is required'),
  prescriptionRequired: z.boolean().default(true),
});

export type InjectionInfusionAttributes = z.infer<typeof injectionInfusionAttributesSchema>;

export const medicalDeviceAttributesSchema = z.object({
  modelNumber: z.string().optional(),
  warrantyMonths: z.number().int().nonnegative().optional(),
  powerSource: z.string().optional(),
  manufacturer: z.string().min(1, 'Manufacturer name is required'),
});

export type MedicalDeviceAttributes = z.infer<typeof medicalDeviceAttributesSchema>;

export const cosmeticsPersonalCareAttributesSchema = z.object({
  volumeMl: z.number().positive().optional(),
  weightGrams: z.number().positive().optional(),
  skinType: z.string().optional(),
  manufacturer: z.string().min(1, 'Manufacturer name is required'),
});

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
