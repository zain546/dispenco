import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivePurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  purchaseItemId!: string;

  @IsInt()
  @Min(0)
  receivedQuantity!: number;

  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @IsDateString()
  expiryDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  sellPrice?: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseItemDto)
  items!: ReceivePurchaseItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
