import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ConferenceService } from "../providers/conference.service";
import {
  CreateConferenceDto,
  UpdateConferenceDto,
  ConferenceFilterDto,
} from "../dto";
import {
  Conference,
  ConferenceVisibility,
} from "../entities/conference.entity";
import { JwtAuthGuard } from "../../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../../security/guards/rolesGuard/roles.guard";
import { UserRole } from "../../common/enums/users-roles.enum";
import { Roles } from "../../../security/decorators/roles.decorator";
import { Request } from "express";
import { User } from "../..//users/entities/user.entity";
import { SearchConferencesDto } from '../dto/search-conferences.dto';

@Controller("conference")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConferenceController {
  constructor(private readonly conferenceService: ConferenceService) {}

  @Get("conferences")
  @ApiOperation({ summary: "Get conferences with filtering and pagination" })
  @ApiQuery({
    name: "name",
    required: false,
    description: "Filter by conference name (partial match)",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filter by conference category",
  })
  @ApiQuery({
    name: "location",
    required: false,
    description:
      "Filter by any location field (country, state, street, LGA - partial match)",
  })
  @ApiQuery({
    name: "visibility",
    required: false,
    description: "Filter by visibility (public/private/draft)",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page (default: 10)",
  })
  @ApiResponse({
    status: 200,
    description: "Returns a paginated list of conferences with metadata",
    schema: {
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              category: { type: "string" },
              date: { type: "string", format: "date-time" },
              location: {
                type: "object",
                properties: {
                  country: { type: "string" },
                  state: { type: "string" },
                  street: { type: "string" },
                  lga: { type: "string" },
                },
              },
              image: { type: "string" },
            },
          },
        },
        meta: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            totalCount: { type: "number" },
            totalPages: { type: "number" },
          },
        },
      },
    },
  })
  async getConferences(
    @Query() filter: ConferenceFilterDto,
    @Req() req: Request,
  ) {
    // If requesting non-public conferences, ensure user is authenticated
    if (
      filter.visibility &&
      filter.visibility !== ConferenceVisibility.PUBLIC
    ) {
      if (!req.user) {
        throw new UnauthorizedException(
          "Authentication required to view non-public conferences",
        );
      }
    }

    return this.conferenceService.findAllWithFilters(filter, req.user as User);
  }

  @Post()
  @ApiOperation({ summary: "Create a new conference" })
  @ApiResponse({
    status: 201,
    description: "The conference has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  create(
    @Body() createConferenceDto: CreateConferenceDto,
    @Req() req: Request,
  ): Promise<Conference> {
    const user = req.user as User;
    return this.conferenceService.create(createConferenceDto, user);
  }

  @Get()
  findAll(): Promise<Conference[]> {
    return this.conferenceService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Conference> {
    return this.conferenceService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateConferenceDto: UpdateConferenceDto,
  ): Promise<Conference> {
    return this.conferenceService.update(id, updateConferenceDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.conferenceService.remove(id);
  }
   @Get('search')
  async searchConferences(@Query() query: SearchConferencesDto) {
    const { query: searchTerm, category, location, page, limit } = query;

    const offset = (page - 1) * limit;

    const results = await this. conferenceService.fuzzySearch(
      searchTerm,
      category,
      location,
      limit,
      offset,
    );

    return {
      data: results,
      pagination: {
        page,
        limit,
        count: results.length,
      },
    };
  }
}
