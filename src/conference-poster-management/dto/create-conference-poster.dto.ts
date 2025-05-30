import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateConferencePosterDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsUUID()
  conferenceId: string;  
  
  imageUrl: any; // not validated by class-validator. Validation is handled by Multer
}