import { IsString, IsNumber, IsBoolean, IsUUID, IsDate } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Name of the ticket',
    example: 'VIP Pass'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'UUID of the associated event',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: 'Number of tickets available',
    example: 100
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Price of the ticket',
    example: 49.99
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Description of the ticket type',
    example: 'VIP access with meet and greet'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Deadline date for ticket sales',
    example: '2025-12-31T23:59:59Z'
  })
  @IsDate()
  deadlineDate: Date;

  @ApiProperty({
    description: 'Whether the ticket is reserved',
    example: false
  })
  @IsBoolean()
  isReserved: boolean;
}
