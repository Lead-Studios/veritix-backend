import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty } from "class-validator"

export class LoginDto {
  @ApiProperty({
    description: "Username",
    example: "admin",
  })
  @IsString()
  @IsNotEmpty()
  username: string

  @ApiProperty({
    description: "Password",
    example: "password123",
  })
  @IsString()
  @IsNotEmpty()
  password: string
}

