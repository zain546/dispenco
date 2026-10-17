import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class BroadcastSettingDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetStoreIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  receiptFooter?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiryAlertDays?: number;
}
