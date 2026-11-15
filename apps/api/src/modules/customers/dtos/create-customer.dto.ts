import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @Min(-10000000)
  @Max(10000000)
  @IsOptional()
  @Type(() => Number)
  initialCreditBalance?: number;
}
