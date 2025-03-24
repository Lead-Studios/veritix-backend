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
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { PostersService } from "./posters.service"
import { CreatePosterDto } from "./dto/create-poster.dto"
import { UpdatePosterDto } from "./dto/update-poster.dto"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger"
import type { Express } from "express"

@ApiTags("posters")
@Controller("posters")
@ApiBearerAuth()
export class PostersController {
  constructor(private readonly postersService: PostersService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Upload a new event poster" })
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
        eventId: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Poster created successfully" })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async create(@UploadedFile() file: Express.Multer.File, @Body() createPosterDto: CreatePosterDto) {
    return this.postersService.create(file, createPosterDto)
  }

  @Get()
  @ApiOperation({ summary: "Retrieve all posters" })
  @ApiResponse({ status: HttpStatus.OK, description: "Retrieved all posters" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findAll() {
    return this.postersService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single poster by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Retrieved poster' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Poster not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postersService.findOne(id);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Retrieve all posters for a specific event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Retrieved posters for event' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async findByEvent(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.postersService.findByEvent(eventId);
  }

  @Put(":id")
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
        eventId: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Poster updated successfully" })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Poster not found" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatePosterDto: UpdatePosterDto,
  ) {
    return this.postersService.update(id, file, updatePosterDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a poster' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Poster deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Poster not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postersService.remove(id);
  }
}

