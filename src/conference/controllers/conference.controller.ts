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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ConferenceService } from "../providers/conference.service";
import {
  CreateConferenceDto,
  UpdateConferenceDto,
  ConferenceFilterDto,
} from "../dto";
import { Conference } from "../entities/conference.entity";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { Roles } from "src/dynamic-pricing/auth/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { Request } from "express";

@Controller("conference")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConferenceController {
  constructor(private readonly conferenceService: ConferenceService) {}

  @Post()
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  create(
    @Body() createConferenceDto: CreateConferenceDto,
  ): Promise<Conference> {
    return this.conferenceService.create(createConferenceDto);
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
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateConferenceDto: UpdateConferenceDto,
  ): Promise<Conference> {
    return this.conferenceService.update(id, updateConferenceDto);
  }

  @Delete(":id")
  @RoleDecorator(UserRole.Admin)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.conferenceService.remove(id);
  }

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
              description: { type: "string" },
              visibility: {
                type: "string",
                enum: ["public", "private", "draft"],
              },
              organizer: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  name: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                },
              },
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
    return this.conferenceService.findAllWithFilters(filter, req.user as any);
  }
}
