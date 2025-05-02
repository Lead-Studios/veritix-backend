import { IsEmail, IsNotEmpty, IsString, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollaboratorDto {
  @ApiProperty({
    description: 'The name of the collaborator',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The email of the collaborator',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'URL to the collaborator\'s image',
    example: 'https://example.com/images/john-doe.jpg',
  })
  @IsNotEmpty()
  @IsUrl()
  image: string;

  @ApiProperty({
    description: 'The ID of the conference',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  conferenceId: string;
}