import { IsString, IsEmail, IsUUID, IsOptional } from 'class-validator';

export class CreateCollaboratorDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsUUID()
  eventId: string;
}