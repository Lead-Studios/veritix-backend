import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateSponsorDto } from './create-sponsor.dto';

/**
 * using the patch to edit part of the data, the partialtype makes everything optional
 */
export class UpdateSponsorDto extends CreateSponsorDto {
  /**
   * a unique id of number used to edit create user dto
   */
  @IsInt()
  @IsNotEmpty()
  id: number;
}
