import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelTicketDto {
  @ApiPropertyOptional({
    example: 'Fraudulent purchase',
    description: 'Optional audit reason for cancelling this ticket',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
