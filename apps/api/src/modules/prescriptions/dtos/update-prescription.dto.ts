import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PrescriptionStatus } from '@prisma/client';

export class UpdatePrescriptionDto {
  @IsString()
  @IsOptional()
  patientName?: string;

  @IsString()
  @IsOptional()
  patientPhone?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  patientAge?: number;

  @IsString()
  @IsOptional()
  patientGender?: string;

  @IsString()
  @IsOptional()
  patientCnic?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  doctorLicenseNumber?: string;

  @IsString()
  @IsOptional()
  doctorHospital?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  imageReference?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(PrescriptionStatus)
  @IsOptional()
  status?: PrescriptionStatus;

  @IsString()
  @IsOptional()
  saleId?: string;
}

export class DispensePrescriptionDto {
  @IsString()
  @IsOptional()
  saleId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  items?: Array<{
    itemId: string;
    quantityDispensed: number;
  }>;
}
