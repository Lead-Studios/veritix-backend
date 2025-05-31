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
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({
    description: "User's first name",
    minLength: 3,
    example: "John",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  firstName: string;

  @ApiProperty({
    description: "User's last name",
    minLength: 3,
    example: "Doe",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  lastName: string;

  @ApiProperty({
    description: "User's username",
    minLength: 3,
    example: "johndoe",
  })
  @IsString()
  @MinLength(3)
  userName: string;

  @ApiProperty({
    description: "User's email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      "User's password. Must include uppercase, lowercase, number, and special character",
    maxLength: 225,
    example: "StrongP@ss123",
  })
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

  @ApiProperty({
    description: "User's role in the system",
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
}
