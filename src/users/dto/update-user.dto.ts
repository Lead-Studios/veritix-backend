import { PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";
import { PrimaryColumn } from "typeorm";
import { IsString, IsNotEmpty } from "class-validator";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @PrimaryColumn()
  @IsNotEmpty()
  @IsString()
  id: string;
}
