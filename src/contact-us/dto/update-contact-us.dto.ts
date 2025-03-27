import { PartialType } from '@nestjs/mapped-types';
import { CreateContactUsDto } from './create-contact-us.dto';

export class UpdateContactUsDto extends PartialType(CreateContactUsDto) {}