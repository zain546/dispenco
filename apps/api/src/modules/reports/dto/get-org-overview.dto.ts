import { IsOptional, IsDateString } from 'class-validator';

export class GetOrgOverviewDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
