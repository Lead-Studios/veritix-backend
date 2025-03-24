import { IsString } from "class-validator";

export class GetEventParamDto {
  @IsString()
  id: string;
}
