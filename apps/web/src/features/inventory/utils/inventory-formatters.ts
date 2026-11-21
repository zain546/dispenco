import {
  Package,
  Pill,
  Syringe,
  Droplet,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../schemas/product-schema';
import { formatDate } from '@/lib/format';

export { formatDate };

export function formatCategory(catVal: string): string {
  const found = PRODUCT_CATEGORIES.find((c) => c.value === catVal);
  return found ? found.label : catVal;
}

export function formatUnitPlural(unit: string = 'Unit', count?: number): string {
  if (count === 1) return `${count} ${unit}`;

  const cleanUnit = unit.trim();
  let pluralUnit = cleanUnit;

  const lower = cleanUnit.toLowerCase();
  if (lower.endsWith('box')) {
    pluralUnit = cleanUnit.replace(/box$/i, 'Boxes');
  } else if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch') || lower.endsWith('sh')) {
    pluralUnit = `${cleanUnit}es`;
  } else if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) {
    pluralUnit = cleanUnit.slice(0, -1) + 'ies';
  } else if (!lower.endsWith('s')) {
    pluralUnit = `${cleanUnit}s`;
  }

  return count !== undefined ? `${count} ${pluralUnit}` : pluralUnit;
}

export interface MedicineIconConfig {
  Icon: LucideIcon;
  bgClass: string;
}

export function getMedicineIconConfig(
  category: string,
  name?: string,
  unit?: string,
): MedicineIconConfig {
  const upperCat = (category || '').toUpperCase();
  const upperName = (name || '').toUpperCase();
  const upperUnit = (unit || '').toUpperCase();

  // Injections & IV Infusions or Vials/Ampoules/Pens
  if (
    upperCat.includes('INJECTION') ||
    upperCat.includes('INFUSION') ||
    upperUnit === 'VIAL' ||
    upperUnit === 'AMPOULE' ||
    upperName.includes('INJECTION') ||
    upperName.includes('PEN')
  ) {
    return {
      Icon: Syringe,
      bgClass: 'bg-destructive/10 text-destructive',
    };
  }

  // Syrups & Liquids or Drops & Bottles
  if (
    upperCat.includes('SYRUP') ||
    upperCat.includes('LIQUID') ||
    upperUnit === 'BOTTLE' ||
    upperName.includes('SYRUP') ||
    upperName.includes('DROPS') ||
    upperName.includes('SUSPENSION') ||
    upperName.includes('ELIXIR')
  ) {
    return {
      Icon: Droplet,
      bgClass: 'bg-warning/10 text-warning',
    };
  }

  // Medical Devices & Equipment / Monitors
  if (
    upperCat.includes('DEVICE') ||
    upperCat.includes('EQUIPMENT') ||
    upperName.includes('MONITOR') ||
    upperName.includes('THERMOMETER') ||
    upperName.includes('BP') ||
    upperName.includes('PULSE')
  ) {
    return {
      Icon: Stethoscope,
      bgClass: 'bg-primary/10 text-primary',
    };
  }

  // General OTC / Protection / Mask / Supplies
  if (
    upperCat.includes('GENERAL') ||
    upperCat.includes('COSMETICS') ||
    upperName.includes('MASK') ||
    upperName.includes('BANDAGE') ||
    upperName.includes('SUPPLY')
  ) {
    return {
      Icon: Package,
      bgClass: 'bg-secondary text-secondary-foreground',
    };
  }

  // Default Tablets / Capsules / Pills
  return {
    Icon: Pill,
    bgClass: 'bg-success/10 text-success',
  };
}
