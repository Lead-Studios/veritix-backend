/* eslint-disable prettier/prettier */
import {
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateAdminDto } from "./create-admin.dto";

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastNameName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password?: string;

  @IsOptional()
  @IsString()
  @IsIn(["admin"], {
    message: "Role must be either 'admin' or 'super_admin'",
  })
  role?: string;
}
