import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(OmitType(CreateEventDto, ['status'] as const)) {}
