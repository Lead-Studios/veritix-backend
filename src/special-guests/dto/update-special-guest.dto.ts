import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecialGuestDto } from './create-special-guest.dto';

export class UpdateSpecialGuestDto extends PartialType(CreateSpecialGuestDto) {}
