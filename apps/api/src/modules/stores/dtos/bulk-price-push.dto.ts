import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class BulkPricePushDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  newSellPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(500)
  percentageAdjustment?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetStoreIds?: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}
