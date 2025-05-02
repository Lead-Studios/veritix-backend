import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { EventStatus } from '../../common/enums/event-status.enum';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiProperty({
    description: 'Updated status of the event',
    enum: EventStatus,
    example: EventStatus.PUBLISHED,
    required: false
  })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}
