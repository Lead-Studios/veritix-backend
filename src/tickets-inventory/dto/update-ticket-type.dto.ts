import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketTypeDto } from './create-ticket-type.dto';

export class UpdateTicketTypeDto extends PartialType(CreateTicketTypeDto) {}
