import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CopilotQueryDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  timeframe?: string;
}
