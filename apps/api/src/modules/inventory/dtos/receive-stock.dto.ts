import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveStockDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;

  @IsDateString({}, { message: 'Please provide a valid expiry date' })
  @IsNotEmpty()
  expiryDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Cost price cannot be negative' })
  costPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Sell price (MRP) cannot be negative' })
  sellPrice!: number;

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
}
