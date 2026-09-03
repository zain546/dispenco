import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  leadTimeDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
