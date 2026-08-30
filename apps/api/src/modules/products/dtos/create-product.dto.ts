import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name!: string;

  @IsString()
  @IsOptional()
  genericName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category!: string;

  @IsString()
  @IsNotEmpty({ message: 'Unit of measure is required' })
  unit!: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  taxCode?: string;

  @IsBoolean()
  @IsOptional()
  isControlledSubstance?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0, { message: 'Low stock threshold must be 0 or greater' })
  @IsOptional()
  lowStockThreshold?: number;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  // Unified Initial Stock & Batch Fields
  @IsInt()
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  @IsOptional()
  initialStockQuantity?: number;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsNumber()
  @Min(0, { message: 'Cost price must be 0 or greater' })
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @Min(0, { message: 'Selling price / MRP must be 0 or greater' })
  @IsOptional()
  sellPrice?: number;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  rackNumber?: string;

  @IsString()
  @IsOptional()
  vendorName?: string;

  // Manufacturing & Purchase Invoice Details
  @IsString()
  @IsOptional()
  mfgDate?: string;

  @IsString()
  @IsOptional()
  purchaseInvoiceNumber?: string;

  @IsString()
  @IsOptional()
  purchaseInvoiceDate?: string;
}
