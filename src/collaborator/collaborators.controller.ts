import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  UploadedFile,
  ParseUUIDPipe,
} from "@nestjs/common";
import { CollaboratorsService } from "./collaborators.service";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express"
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("collaborators")
@Controller("collaborators")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Upload a new event Collaborator" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
        },
        name: {
          type: "string",
        },
        email: {
          type: "string",
        },
        eventId: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Collaborator created successfully",
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createCollaboratorDto: CreateCollaboratorDto,
  ) {
    return this.collaboratorsService.create(file, createCollaboratorDto);
  }

  @Get()
  @ApiOperation({ summary: "Retrieve all collaborators" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Retrieved all collaborator",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findAll() {
    return this.collaboratorsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve collaborator by ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Retrieved collaborator" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "collaborator not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.collaboratorsService.findOne(id);
  }

  @Get("event/:eventId")
  @ApiOperation({ summary: "Retrieve all collaborator for a specific event" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Retrieved collaborator for event",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async findByEvent(@Param("eventId", new ParseUUIDPipe()) eventId: string) {
    return this.collaboratorsService.findByEvent(eventId);
  }

  @Put(":id")
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Update a collaborator" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
        },
        name: {
          type: "string",
        },
        email: {
          type: "string",
        },
        eventId: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: "collaborator updated successfully" })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Collaborator not found" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Forbidden" })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateCollaboratorDto: Partial<CreateCollaboratorDto>,
  ) {
    return this.collaboratorsService.update(id, file, updateCollaboratorDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: 'Delete a collaborator' })
  @ApiResponse({ status: HttpStatus.OK, description: 'collaborator deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Collaborator not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  remove(@Param("id") id: string) {
    return this.collaboratorsService.remove(id);
  }
}
