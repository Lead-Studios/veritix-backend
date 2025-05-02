import { IsNotEmpty, IsObject, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSponsorDto {
  @ApiProperty({
    description: 'URL of the sponsor\'s brand image or logo',
    example: 'https://example.com/images/sponsor-logo.png'
  })
  @IsString()
  @IsNotEmpty()
  brandImage: string;

  @ApiProperty({
    description: 'Name of the sponsoring brand or company',
    example: 'Tech Corp International'
  })
  @IsString()
  @IsNotEmpty()
  brandName: string;

  @ApiProperty({
    description: 'Website URL of the sponsor',
    example: 'https://techcorp.com'
  })
  @IsUrl()
  brandWebsite: string;

  @ApiPropertyOptional({
    description: 'Social media links for the sponsor',
    example: {
      facebook: 'https://facebook.com/techcorp',
      twitter: 'https://twitter.com/techcorp',
      instagram: 'https://instagram.com/techcorp'
    }
  })
  @IsObject()
  socialMediaLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
  };

  @ApiProperty({
    description: 'ID of the event being sponsored',
    example: 1
  })
  @IsNotEmpty()
  eventId: number;
}
