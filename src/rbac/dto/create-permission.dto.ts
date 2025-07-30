import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Unique name of the permission (e.g., can:create_event)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of what the permission allows', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
