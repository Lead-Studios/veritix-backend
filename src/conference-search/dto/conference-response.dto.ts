import { ApiProperty } from '@nestjs/swagger';

export class ConferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conferenceName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  location: {
    country: string;
    state: string;
    city: string;
  };

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  website?: string;

  @ApiProperty()
  relevanceScore?: number;
}

export class PaginatedConferenceResponseDto {
  @ApiProperty({ type: [ConferenceResponseDto] })
  data: ConferenceResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;
}
