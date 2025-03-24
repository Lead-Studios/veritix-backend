import { IsNotEmpty, IsString, IsUUID } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreatePosterDto {
  @ApiProperty({ description: "Description of the poster" })
  @IsNotEmpty()
  @IsString()
  description: string

  @ApiProperty({ description: "Event ID associated with the poster" })
  @IsNotEmpty()
  @IsUUID()
  eventId: string
}

