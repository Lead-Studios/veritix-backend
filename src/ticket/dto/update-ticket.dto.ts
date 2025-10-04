import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum UpdateTicketStatusInput {
  VALID = 'valid',
  USED = 'used',
  TRANSFERRED = 'transferred',
}

export class UpdateTicketDto {
  @ApiProperty({
    description: 'Update status',
    enum: UpdateTicketStatusInput,
    required: false,
  })
  @IsOptional()
  @IsEnum(UpdateTicketStatusInput)
  status?: UpdateTicketStatusInput;
}
