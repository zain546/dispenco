import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AnomalyType, AnomalyStatus } from '@dispenco/types';

export class GetAnomaliesDto {
  @IsOptional()
  @IsEnum(AnomalyStatus)
  status?: AnomalyStatus | 'ALL';

  @IsOptional()
  @IsEnum(AnomalyType)
  type?: AnomalyType | 'ALL';

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class UpdateAnomalyStatusDto {
  @IsEnum(AnomalyStatus)
  status!: AnomalyStatus;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}

export class TriggerAnomalyScanDto {
  @IsOptional()
  @IsString()
  storeId?: string;
}
