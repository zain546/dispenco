import { IsString, IsOptional, IsArray, ArrayNotEmpty, MaxLength, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Permissions must be provided as an array of permission codes' })
  @ArrayNotEmpty({ message: 'Permission list cannot be empty when provided' })
  @IsString({ each: true })
  permissionNames?: string[];
}
