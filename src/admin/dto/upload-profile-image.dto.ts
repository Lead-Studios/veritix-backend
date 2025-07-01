import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadProfileImageDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  @IsOptional()
  @IsString()
  file?: any;
}
