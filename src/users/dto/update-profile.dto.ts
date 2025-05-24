import {IsString, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({
        description: 'User\'s username',
        required: false,
        example: 'johndoe'
    })
    @IsOptional()
    @IsString()
    userName?: string;

    @ApiProperty({
        description: 'User\'s email address',
        required: false,
        example: 'john.doe@example.com'
    })
    @IsOptional()
    @IsString()
    email?: string;
}

export class ChangePasswordDto {
    @ApiProperty({
        description: 'User\'s current password',
        example: 'CurrentP@ss123'
    })
    @IsString()
    currentPassword: string;

    @ApiProperty({
        description: 'New password. Must include uppercase, lowercase, number, and special character',
        maxLength: 225,
        example: 'NewStrongP@ss123'
    })
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
    @ApiProperty({
        description: 'URL of the user\'s profile image',
        example: 'https://example.com/images/profile.jpg'
    })
    @IsString()
    imageUrl: string;
}
