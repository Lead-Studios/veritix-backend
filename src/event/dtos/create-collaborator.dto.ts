import { IsString, IsNotEmpty, IsEmail, IsUUID } from 'class-validator';

export class CreateCollaboratorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  image: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsUUID()
  eventId: string;
} 