import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityRemaining?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityReceived?: number;

  @IsOptional()
  @IsString()
  mfgDate?: string;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceNumber?: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceDate?: string;

  @IsOptional()
  @IsString()
  rackNumber?: string;
}
