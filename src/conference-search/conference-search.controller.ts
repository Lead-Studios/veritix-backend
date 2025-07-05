import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PaginatedConferenceResponseDto } from './dto/conference-response.dto';
import {
  SortBy,
  SortOrder,
  SearchConferenceDto,
} from './dto/search-conference.dto';
import { ConferenceSearchService } from './conference-search.service';

@ApiTags('Conference Search')
@Controller('conferences')
@UseGuards(ThrottlerGuard)
export class ConferenceSearchController {
  private readonly logger = new Logger(ConferenceSearchController.name);

  constructor(
    private readonly conferenceSearchService: ConferenceSearchService,
  ) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search conferences with fuzzy matching',
    description:
      'Search for conferences by name, category, and location with typo tolerance',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved search results',
    type: PaginatedConferenceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiQuery({ name: 'query', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: SortBy,
    description: 'Sort by field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: SortOrder,
    description: 'Sort order',
  })
  searchConferences(
    @Query(new ValidationPipe({ transform: true }))
    searchDto: SearchConferenceDto,
  ): Promise<PaginatedConferenceResponseDto> {
    this.logger.log(`Search request: ${JSON.stringify(searchDto)}`);

    return this.conferenceSearchService.searchConferences(searchDto);
  }
}
