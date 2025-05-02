import { IsString, IsOptional, IsUrl, IsInt } from 'class-validator';

export class CreateSpecialSpeakerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsInt()
  conferenceId: number;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  instagram?: string;
}
