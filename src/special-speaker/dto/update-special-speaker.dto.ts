import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecialSpeakerDto } from './create-special-speaker.dto';

export class UpdateSpecialSpeakerDto extends PartialType(CreateSpecialSpeakerDto) {}
