import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @IsString()
  @IsOptional()
  receiptFooter?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  expiryAlertDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
