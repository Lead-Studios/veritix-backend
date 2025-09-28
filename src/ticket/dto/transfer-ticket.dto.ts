import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class TransferTicketDto {
  @ApiProperty({
    description: 'The UUID of the new owner',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsString()
  newOwnerId: string;

  @ApiProperty({
    description: 'Optional reason for transfer',
    example: 'Gift to friend',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
