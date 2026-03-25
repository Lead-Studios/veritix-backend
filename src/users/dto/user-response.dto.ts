import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/auth/common/enum/user-role-enum';

/**
 * Safe user representation returned from all public-facing endpoints.
 * Deliberately excludes: password, verificationCode, passwordResetCode,
 * verificationCodeExpiresAt, passwordResetCodeExpiresAt.
 */
export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'alice@example.com' })
  email: string;

  @ApiProperty({ example: 'Alice Johnson' })
  fullName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.SUBSCRIBER })
  role: UserRole;

  @ApiProperty({
    example: true,
    description: 'Whether the email has been verified',
  })
  isVerified: boolean;

  @ApiPropertyOptional({ example: '+2348012345678', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiPropertyOptional({
    example: 'Blockchain enthusiast based in Lagos.',
    nullable: true,
  })
  bio: string | null;

  @ApiPropertyOptional({ example: 'Nigeria', nullable: true })
  country: string | null;

  @ApiPropertyOptional({
    example: 'GBXXX...56CHARSTELLARADDRESS',
    nullable: true,
    description: 'Stellar public key for refunds',
  })
  stellarWalletAddress: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-02-15T12:30:00.000Z' })
  updatedAt: Date;
}
