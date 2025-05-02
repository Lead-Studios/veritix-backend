import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSponsorDto {
  @ApiProperty({
    description: 'Unique identifier of the sponsor',
    example: 1
  })
  @IsInt()
  @IsNotEmpty()
  id: number;

  @ApiPropertyOptional({
    description: 'Updated URL of the sponsor\'s brand image or logo',
    example: 'https://example.com/images/sponsor-logo-new.png'
  })
  @IsString()
  @IsOptional()
  brandImage?: string;

  @ApiPropertyOptional({
    description: 'Updated name of the sponsoring brand or company',
    example: 'Tech Corp International LLC'
  })
  @IsString()
  @IsOptional()
  brandName?: string;

  @ApiPropertyOptional({
    description: 'Updated website URL of the sponsor',
    example: 'https://techcorp-global.com'
  })
  @IsUrl()
  @IsOptional()
  brandWebsite?: string;

  @ApiPropertyOptional({
    description: 'Updated social media links for the sponsor',
    example: {
      facebook: 'https://facebook.com/techcorp-global',
      twitter: 'https://twitter.com/techcorp_global',
      instagram: 'https://instagram.com/techcorp_global'
    }
  })
  @IsObject()
  @IsOptional()
  socialMediaLinks?: {
    facebook: string;
    twitter: string;
    instagram: string;
  };

  @ApiPropertyOptional({
    description: 'Updated ID of the event being sponsored',
    example: 2
  })
  @IsInt()
  @IsOptional()
  eventId?: number;
}
