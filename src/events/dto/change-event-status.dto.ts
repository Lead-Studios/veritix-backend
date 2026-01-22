import { IsEnum } from 'class-validator';
import { EventStatus } from "../../common/enums/event-status.enum";

export class ChangeEventStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}
