import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateConferencePosterDto } from './create-conference-poster.dto';

export class UpdateConferencePosterDto extends PartialType(CreateConferencePosterDto) {
  @ApiProperty({
    description: 'Description of the conference poster',
    example: 'Updated promotional poster for DevConf 2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UUID of the associated conference',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  conferenceId?: string;
}