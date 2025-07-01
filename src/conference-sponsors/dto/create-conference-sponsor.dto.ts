import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsUUID,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateConferenceSponsorDto {
  @ApiProperty({ description: "The name of the sponsor brand" })
  @IsNotEmpty()
  @IsString()
  brandName: string;

  @ApiProperty({ description: "The website URL of the sponsor" })
  @IsNotEmpty()
  @IsUrl({}, { message: "Brand website must be a valid URL" })
  brandWebsite: string;

  @ApiProperty({ description: "The UUID of the conference" })
  @IsNotEmpty()
  @IsUUID()
  conferenceId: string;

  @ApiProperty({
    description: "The Facebook URL of the sponsor",
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: "Facebook URL must be a valid URL" })
  @Matches(/^(https?:\/\/)?(www\.)?facebook\.com\/.*$/, {
    message: "Must be a valid Facebook URL",
  })
  facebook?: string;

  @ApiProperty({
    description: "The Twitter URL of the sponsor",
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: "Twitter URL must be a valid URL" })
  @Matches(/^(https?:\/\/)?(www\.)?twitter\.com\/.*$/, {
    message: "Must be a valid Twitter URL",
  })
  twitter?: string;

  @ApiProperty({
    description: "The Instagram URL of the sponsor",
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: "Instagram URL must be a valid URL" })
  @Matches(/^(https?:\/\/)?(www\.)?instagram\.com\/.*$/, {
    message: "Must be a valid Instagram URL",
  })
  instagram?: string;
}

export class ConferenceSponsorResponseDto {
  id: string;
  brandName: string;
  brandWebsite: string;
  brandImage: string;
  conferenceId: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  createdAt: Date;
  updatedAt: Date;
}
