import { IsEmail, IsString, Matches, MinLength } from "class-validator";
export class CreateAdminDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[!@#$%^&])(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]{8,16}$/,
    {
      message:
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
    },
  )
  password: string;

  @IsString()
  role?: string;
}
