import { IsUrl, IsString, MinLength, IsOptional } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterOrganizerDto extends RegisterDto {
  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsUrl()
  @IsOptional()
  organizationWebsite?: string;
}
