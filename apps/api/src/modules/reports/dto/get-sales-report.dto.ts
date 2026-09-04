import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum GroupByFrequency {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetSalesReportDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(GroupByFrequency)
  groupBy?: GroupByFrequency = GroupByFrequency.DAY;

  @IsOptional()
  @IsString()
  storeId?: string;
}
