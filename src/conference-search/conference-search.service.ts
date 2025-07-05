import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuzzySearchService } from './services/fuzzy-search.service';
import {
  PaginatedConferenceResponseDto,
  ConferenceResponseDto,
} from './dto/conference-response.dto';
import { SearchConferenceDto, SortBy } from './dto/search-conference.dto';
import { Conference } from './entities/conference.entity';

export interface SearchResult {
  conference: Conference;
  relevanceScore: number;
}

@Injectable()
export class ConferenceSearchService {
  private readonly logger = new Logger(ConferenceSearchService.name);

  constructor(
    @InjectRepository(Conference)
    private readonly conferenceRepository: Repository<Conference>,
    private readonly fuzzySearchService: FuzzySearchService,
  ) {}

  async searchConferences(
    searchDto: SearchConferenceDto,
  ): Promise<PaginatedConferenceResponseDto> {
    const startTime = Date.now();

    try {
      // Build base query
      const queryBuilder = this.conferenceRepository
        .createQueryBuilder('conference')
        .where('conference.isActive = :isActive', { isActive: true });

      // Apply filters
      if (searchDto.category) {
        queryBuilder.andWhere(
          'LOWER(conference.category) LIKE LOWER(:category)',
          {
            category: `%${searchDto.category}%`,
          },
        );
      }

      if (searchDto.location) {
        queryBuilder.andWhere(
          '(LOWER(conference.country) LIKE LOWER(:location) OR LOWER(conference.state) LIKE LOWER(:location) OR LOWER(conference.city) LIKE LOWER(:location))',
          { location: `%${searchDto.location}%` },
        );
      }

      // Get all matching conferences for fuzzy search
      const conferences = await queryBuilder.getMany();

      // Apply fuzzy search and calculate relevance scores
      const searchResults: SearchResult[] = [];

      for (const conference of conferences) {
        let relevanceScore = 0;

        if (searchDto.query) {
          // Calculate fuzzy scores for different fields
          const nameScore = this.fuzzySearchService.calculateFuzzyScore(
            searchDto.query,
            conference.conferenceName,
          );
          const categoryScore = this.fuzzySearchService.calculateFuzzyScore(
            searchDto.query,
            conference.category,
          );
          const locationScore = Math.max(
            this.fuzzySearchService.calculateFuzzyScore(
              searchDto.query,
              conference.country,
            ),
            this.fuzzySearchService.calculateFuzzyScore(
              searchDto.query,
              conference.state,
            ),
            this.fuzzySearchService.calculateFuzzyScore(
              searchDto.query,
              conference.city,
            ),
          );

          // Weighted relevance score (name is most important)
          relevanceScore =
            nameScore * 0.5 + categoryScore * 0.3 + locationScore * 0.2;
        } else {
          // No search query, all results are equally relevant
          relevanceScore = 1;
        }

        // Only include results with minimum relevance (or no search query)
        if (relevanceScore > 0.2 || !searchDto.query) {
          searchResults.push({
            conference,
            relevanceScore,
          });
        }
      }

      // Sort results
      this.sortResults(searchResults, searchDto);

      // Apply pagination
      const total = searchResults.length;
      const offset = (searchDto.page - 1) * searchDto.limit;
      const paginatedResults = searchResults.slice(
        offset,
        offset + searchDto.limit,
      );

      // Transform to response DTOs
      const data = paginatedResults.map((result) =>
        this.transformToResponseDto(result),
      );

      const totalPages = Math.ceil(total / searchDto.limit);

      const response: PaginatedConferenceResponseDto = {
        data,
        total,
        page: searchDto.page,
        limit: searchDto.limit,
        totalPages,
        hasNextPage: searchDto.page < totalPages,
        hasPreviousPage: searchDto.page > 1,
      };

      const endTime = Date.now();
      this.logger.log(
        `Search completed in ${endTime - startTime}ms. Found ${total} results.`,
      );

      return response;
    } catch (error) {
      this.logger.error('Error searching conferences:', error);
      throw error;
    }
  }

  private sortResults(
    results: SearchResult[],
    searchDto: SearchConferenceDto,
  ): void {
    results.sort((a, b) => {
      switch (searchDto.sortBy) {
        case SortBy.RELEVANCE:
          return searchDto.sortOrder === 'DESC'
            ? b.relevanceScore - a.relevanceScore
            : a.relevanceScore - b.relevanceScore;

        case SortBy.DATE:
          const dateA = new Date(a.conference.startDate).getTime();
          const dateB = new Date(b.conference.startDate).getTime();
          return searchDto.sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;

        case SortBy.NAME:
          const nameA = a.conference.conferenceName.toLowerCase();
          const nameB = b.conference.conferenceName.toLowerCase();
          return searchDto.sortOrder === 'DESC'
            ? nameB.localeCompare(nameA)
            : nameA.localeCompare(nameB);

        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });
  }

  private transformToResponseDto(result: SearchResult): ConferenceResponseDto {
    const { conference, relevanceScore } = result;

    return {
      id: conference.id,
      conferenceName: conference.conferenceName,
      category: conference.category,
      location: {
        country: conference.country,
        state: conference.state,
        city: conference.city,
      },
      startDate: conference.startDate,
      endDate: conference.endDate,
      description: conference.description,
      website: conference.website,
      relevanceScore: Math.round(relevanceScore * 100) / 100, // Round to 2 decimal places
    };
  }
}
