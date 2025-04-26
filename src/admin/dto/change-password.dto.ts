import {IsString, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    currentPassword: string;

    @IsString()
    @MaxLength(225)
    @Matches(
        /^(?=.*[!@#$%^&])(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]{8,16}$/,
        {
          message:
            "New password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
      )
      newPassword: string;
}

