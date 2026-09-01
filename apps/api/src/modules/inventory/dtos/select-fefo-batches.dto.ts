import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class SelectFefoBatchesDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantityNeeded!: number;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsBoolean()
  @IsOptional()
  allowExpired?: boolean;
}
