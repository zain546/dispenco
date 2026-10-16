import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrescriptionStatus } from '@prisma/client';

export class CreatePrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsOptional()
  dosage?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  durationDays?: number;

  @IsInt()
  @Min(1)
  quantityPrescribed!: number;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsNotEmpty()
  patientName!: string;

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
  @IsNotEmpty()
  doctorName!: string;

  @IsString()
  @IsOptional()
  doctorLicenseNumber?: string;

  @IsString()
  @IsOptional()
  doctorHospital?: string;

  @IsDateString()
  @IsOptional()
  prescriptionDate?: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items!: CreatePrescriptionItemDto[];
}
