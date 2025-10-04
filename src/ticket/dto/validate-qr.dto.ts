import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateQrDto {
  @ApiProperty({ description: 'QR code string scanned from the ticket' })
  @IsString()
  code: string;
}
