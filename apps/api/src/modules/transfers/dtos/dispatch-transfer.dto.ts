import { IsString, IsNotEmpty, IsArray, ValidateNested, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DispatchTransferItemDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @IsInt()
  @Min(1)
  quantitySent!: number;
}

export class DispatchTransferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchTransferItemDto)
  items!: DispatchTransferItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
