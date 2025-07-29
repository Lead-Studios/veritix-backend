import { IsString, IsOptional } from 'class-validator';

export class CreateSpeakerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  headshotUrl?: string;
}
