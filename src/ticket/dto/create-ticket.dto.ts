import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';

// Business request uses: valid | used | transferred
// Map to entity enum: ACTIVE | USED | TRANSFERRED
export enum CreateTicketStatusInput {
  VALID = 'valid',
  USED = 'used',
  TRANSFERRED = 'transferred',
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Event ID the ticket belongs to' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ description: 'Owner (user) ID for the ticket' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({
    description: 'Initial status of the ticket',
    enum: CreateTicketStatusInput,
    required: false,
    default: CreateTicketStatusInput.VALID,
  })
  @IsOptional()
  @IsEnum(CreateTicketStatusInput)
  status?: CreateTicketStatusInput;
}
