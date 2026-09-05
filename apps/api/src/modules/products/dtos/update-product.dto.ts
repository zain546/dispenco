import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  genericName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

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

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  rackNumber?: string;

  @IsString()
  @IsOptional()
  vendorName?: string;

  @IsString()
  @IsOptional()
  mfgDate?: string;

  @IsString()
  @IsOptional()
  purchaseInvoiceNumber?: string;

  @IsString()
  @IsOptional()
  purchaseInvoiceDate?: string;

  @IsBoolean()
  @IsOptional()
  isPriority?: boolean;
}
