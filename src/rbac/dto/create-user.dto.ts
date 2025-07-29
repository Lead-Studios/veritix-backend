import {
  IsEmail,
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Role } from '../../rbac/enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];
}
