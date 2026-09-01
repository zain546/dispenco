import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';

export enum StockAdjustmentReason {
  DAMAGED = 'DAMAGED',
  EXPIRED_WRITEOFF = 'EXPIRED_WRITEOFF',
  RECOUNT = 'RECOUNT',
  OTHER = 'OTHER',
}

export class AdjustStockDto {
  @IsNumber()
  @Min(0)
  newQuantity!: number;

  @IsEnum(StockAdjustmentReason)
  @IsNotEmpty()
  reason!: StockAdjustmentReason;

  @IsString()
  @IsOptional()
  notes?: string;
}
