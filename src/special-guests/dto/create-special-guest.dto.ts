import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialGuestDto {
  @ApiProperty({
    description: 'Name of the special guest',
    example: 'John Doe'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'ID of the event this special guest is appearing at',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: 'URL of the special guest\'s profile image',
    example: 'https://example.com/images/john-doe.jpg'
  })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Special guest\'s Facebook profile URL',
    example: 'https://facebook.com/johndoe'
  })
  @IsOptional()
  @IsUrl()
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Special guest\'s Twitter profile URL',
    example: 'https://twitter.com/johndoe'
  })
  @IsOptional()
  @IsUrl()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'Special guest\'s Instagram profile URL',
    example: 'https://instagram.com/johndoe'
  })
  @IsOptional()
  @IsUrl()
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Bio or description of the special guest',
    example: 'Award-winning tech innovator and keynote speaker'
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Role or title of the special guest at the event',
    example: 'Keynote Speaker'
  })
  @IsOptional()
  @IsString()
  role?: string;
}
