import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRsvpDto {
  @ApiProperty({
    description: 'The ID of the event the user is RSVPing to',
    example: 'a5c2f51f-b8e9-4cc0-9b4a-4f65e6a3879c',
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: 'The ID of the user RSVPing',
    example: '7f57e356-c2b4-4b85-9022-0c88c5c9c5bd',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}