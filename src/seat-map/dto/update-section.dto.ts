import { PartialType } from '@nestjs/mapped-types';
import { CreateSectionDto } from './create-section.dto';

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}
