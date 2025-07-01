import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSpecialGuestDto {
  @ApiPropertyOptional({
    description: 'Updated name of the special guest',
    example: 'John A. Doe'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated event ID for the special guest',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Updated profile image URL',
    example: 'https://example.com/images/john-doe-new.jpg'
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated Facebook profile URL',
    example: 'https://facebook.com/johnadoe'
  })
  @IsOptional()
  @IsUrl()
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Updated Twitter profile URL',
    example: 'https://twitter.com/johnadoe'
  })
  @IsOptional()
  @IsUrl()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'Updated Instagram profile URL',
    example: 'https://instagram.com/johnadoe'
  })
  @IsOptional()
  @IsUrl()
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Updated bio or description',
    example: 'Award-winning tech innovator, keynote speaker, and bestselling author'
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Updated role or title at the event',
    example: 'Featured Keynote Speaker'
  })
  @IsOptional()
  @IsString()
  role?: string;
}
