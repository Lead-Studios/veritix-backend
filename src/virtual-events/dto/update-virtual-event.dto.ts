import { PartialType } from '@nestjs/swagger';
import { CreateVirtualEventDto } from './create-virtual-event.dto';

export class UpdateVirtualEventDto extends PartialType(CreateVirtualEventDto) {}
