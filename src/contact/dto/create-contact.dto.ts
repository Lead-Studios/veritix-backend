import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateContactDto {
  @IsNotEmpty({ message: "First name is required" })
  @IsString()
  @MinLength(2, { message: "First name must be at least 2 characters long" })
  @MaxLength(50, { message: "First name must not exceed 50 characters" })
  firstName: string;

  @IsNotEmpty({ message: "Last name is required" })
  @IsString()
  @MinLength(2, { message: "Last name must be at least 2 characters long" })
  @MaxLength(50, { message: "Last name must not exceed 50 characters" })
  lastName: string;

  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;

  @IsNotEmpty({ message: "Message is required" })
  @IsString()
  @MinLength(10, { message: "Message must be at least 10 characters long" })
  @MaxLength(1000, { message: "Message must not exceed 1000 characters" })
  message: string;
}
