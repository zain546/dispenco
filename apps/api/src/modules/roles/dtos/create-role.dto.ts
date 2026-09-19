import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsArray({ message: 'Permissions must be provided as an array of permission codes' })
  @ArrayNotEmpty({ message: 'Role must contain at least one permission' })
  @IsString({ each: true })
  permissionNames!: string[];
}
