import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCollaboratorDto {
  @ApiProperty({ description: 'Name of the collaborator' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email of the collaborator' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Event ID associated with the collaborator' })
  @IsNotEmpty()
  @IsUUID()
  eventId: string;
}