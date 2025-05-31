import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConferencePosterManagementService } from './conference-poster-management.service';
import { CreateConferencePosterDto } from './dto/create-conference-poster.dto';
import { UpdateConferencePosterDto } from './dto/update-conference-poster.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { RolesGuard } from '../../security/guards/rolesGuard/roles.guard';
import { Roles } from "../../security/decorators/roles.decorator";
import { UserRole } from "../../src/common/enums/users-roles.enum";
import type { Express } from "express";

@ApiTags("conference-posters")
@Controller("posters")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConferencePosterManagementController {
  constructor(
    private readonly conferencePosterService: ConferencePosterManagementService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Upload a new conference poster" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
        },
        description: {
          type: "string",
        },
        conferenceId: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Poster created successfully",
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async uploadConferencePoster(
    @UploadedFile() file: Express.Multer.File,
    @Body() createPosterDto: CreateConferencePosterDto,
  ) {
    return this.conferencePosterService.create(file, createPosterDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.USER)
  @ApiOperation({ summary: "Retrieve all posters" })
  @ApiResponse({ status: HttpStatus.OK, description: "Retrieved all posters" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findAll() {
    return this.conferencePosterService.findAll();
  }

  @Get("conference/:conferenceId")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.USER)
  @ApiOperation({ summary: "Retrieve all posters for a specific conference" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Retrieved posters for conference",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findPosterByConference(
    @Param("conferenceId", new ParseUUIDPipe()) conferenceId: string,
  ) {
    return this.conferencePosterService.findByConference(conferenceId);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.USER)
  @ApiOperation({ summary: "Retrieve a single poster by ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Retrieved poster" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Poster not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findPosterById(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.conferencePosterService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Update a poster" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
        },
        description: {
          type: "string",
        },
        conferenceId: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Poster updated successfully",
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Poster not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async updatePoster(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatePosterDto: UpdateConferencePosterDto,
  ) {
    return this.conferencePosterService.update(id, file, updatePosterDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a poster" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Poster deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Poster not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async removePoster(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.conferencePosterService.remove(id);
  }
}
