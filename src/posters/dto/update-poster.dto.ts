import { IsOptional, IsString, IsUUID } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class UpdatePosterDto {
  @ApiProperty({ description: "Description of the poster", required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: "Event ID associated with the poster", required: false })
  @IsOptional()
  @IsUUID()
  eventId?: string
}

