import { PartialType } from '@nestjs/mapped-types';
import { CreateSeatMapDto } from './create-seat-map.dto';

export class UpdateSeatMapDto extends PartialType(CreateSeatMapDto) {}
