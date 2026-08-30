import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
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
}
