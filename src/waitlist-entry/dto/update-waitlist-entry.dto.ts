import { PartialType } from '@nestjs/swagger';
import { CreateWaitlistEntryDto } from './create-waitlist-entry.dto';

export class UpdateWaitlistEntryDto extends PartialType(CreateWaitlistEntryDto) {}
