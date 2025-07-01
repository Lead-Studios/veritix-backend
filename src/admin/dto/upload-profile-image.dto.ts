import { IsOptional, IsString } from 'class-validator';

export class UploadProfileImageDto {
  @IsOptional()
  @IsString()
  profileImage?: string;
}
