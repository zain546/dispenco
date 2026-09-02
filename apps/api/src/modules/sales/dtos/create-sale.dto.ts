import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, PaymentMethod } from '@prisma/client';

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRatePercent?: number;
}

export class CreateSaleDto {
  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  overallDiscount?: number;

  @IsEnum(DiscountType)
  @IsOptional()
  overallDiscountType?: DiscountType;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}
