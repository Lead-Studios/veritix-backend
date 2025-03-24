import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  MaxLength,
  isNotEmpty,
  IsNotEmpty,
  IsEnum,
} from "class-validator";
import { UserRole } from "src/common/enums/users-roles.enum";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  lastName: string

  @IsString()
  @MinLength(3)
  userName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(225)
  @Matches(
    /^(?=.*[!@#$%^&])(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]{8,16}$/,
    {
      message:
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
    },
  )
  password: string;

  
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
}
