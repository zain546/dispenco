import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export enum GroupByFrequency {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetSalesReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(GroupByFrequency)
  groupBy?: GroupByFrequency = GroupByFrequency.DAY;

  @IsOptional()
  @IsString()
  storeId?: string;
}
