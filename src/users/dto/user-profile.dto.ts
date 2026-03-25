import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'User phone number',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'URL of the user avatar image',
  })
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'Blockchain enthusiast and event organizer based in Lagos.',
    description: 'Short user biography (max 500 characters)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'bio must not exceed 500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    example: 'Nigeria',
    description: 'Country of residence',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    example: 'GBXXX...56CHARSTELLARADDRESS',
    description:
      'Stellar public key for ticket refunds. Must start with G and be exactly 56 characters.',
  })
  @IsOptional()
  @IsString()
  @Length(56, 56, {
    message: 'stellarWalletAddress must be exactly 56 characters',
  })
  @Matches(/^G[A-Z2-7]{55}$/, {
    message:
      'stellarWalletAddress must be a valid Stellar public key (starts with G, 56 alphanumeric characters)',
  })
  stellarWalletAddress?: string;
}
