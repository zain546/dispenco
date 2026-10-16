import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ScanPrescriptionOcrDto {
  @IsString()
  @IsNotEmpty()
  imageBase64!: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  rawText?: string;
}
