import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateConferencePosterDto } from './create-conference-poster.dto';

export class UpdateConferencePosterDto extends PartialType(CreateConferencePosterDto) {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  conferenceId?: string;
  
  @IsOptional()
  @IsString()
  imageUrl?: string;
}