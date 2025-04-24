import {IsString, MaxLength, IsOptional, Matches } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    userName?: string;

    @IsOptional()
    @IsString()
    email?: string;
}

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

export class ProfileImageDto {
    @IsString()
    imageUrl: string;
}
