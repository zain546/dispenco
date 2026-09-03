import { IsString, IsOptional, MaxLength } from 'class-validator';

export class VoidSaleDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}
