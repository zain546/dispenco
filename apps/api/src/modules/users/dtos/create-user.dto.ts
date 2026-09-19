import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail({}, { message: 'Valid email address is required' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'A valid role must be selected' })
  roleId!: string;
}
