import { PartialType } from '@nestjs/swagger';
import { CreateVerificationLogDto } from './create-verification-log.dto';

export class UpdateVerificationLogDto extends PartialType(CreateVerificationLogDto) {}
