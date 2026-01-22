import { IsEnum } from 'class-validator';
import { EventStatus } from '../../enums/event-status.enum';

export class ChangeEventStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}
