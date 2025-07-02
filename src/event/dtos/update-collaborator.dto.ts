import { IsString, IsOptional, IsEmail, IsUUID } from 'class-validator';

export class UpdateCollaboratorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;
} 