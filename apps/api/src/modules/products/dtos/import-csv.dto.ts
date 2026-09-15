import { IsString, IsOptional, IsObject, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ParseCsvImportDto {
  @IsString()
  csvContent!: string;

  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;
}

export class CsvProductImportItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Type(() => Number)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costPrice?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  initialStockQuantity?: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  rackNumber?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lowStockThreshold?: number;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsBoolean()
  isControlledSubstance?: boolean;

  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;
}

export class ConfirmCsvImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvProductImportItemDto)
  products!: CsvProductImportItemDto[];
}

