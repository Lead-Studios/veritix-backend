import { IsNotEmpty, IsString } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
