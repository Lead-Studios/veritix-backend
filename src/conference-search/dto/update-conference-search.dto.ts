import { PartialType } from '@nestjs/swagger';
import { CreateConferenceSearchDto } from './create-conference-search.dto';

export class UpdateConferenceSearchDto extends PartialType(CreateConferenceSearchDto) {}
