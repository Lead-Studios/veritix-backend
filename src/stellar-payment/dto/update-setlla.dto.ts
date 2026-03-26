import { PartialType } from '@nestjs/swagger';
import { CreateSetllaDto } from './create-setlla.dto';

export class UpdateSetllaDto extends PartialType(CreateSetllaDto) {}
