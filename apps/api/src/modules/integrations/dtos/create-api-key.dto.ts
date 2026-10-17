import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { PublicApiScope } from '@dispenco/types';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissions!: PublicApiScope[];

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  rateLimit?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number | null;
}
