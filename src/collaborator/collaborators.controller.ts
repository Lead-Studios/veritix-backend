import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { CollaboratorsService } from "./collaborators.service";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";
import { UpdateCollaboratorDto } from "./dto/update-collaborator.dto";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";
import { Collaborator } from "./entities/collaborator.entity";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Collaborators")
@ApiBearerAuth()
@Controller("collaborators")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Post()
  @RoleDecorator(UserRole.Admin)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({
    summary: "Create collaborator",
    description: "Add a new collaborator to an event",
  })
  @ApiConsumes("multipart/form-data") // Specify content type for file upload
  @ApiBody({
    description: "Collaborator details and image",
    type: CreateCollaboratorDto, // DTO defines other fields
    // Add schema for file if needed, often handled by swagger-cli plugin
  })
  @ApiResponse({
    status: 201,
    description: "Collaborator created successfully",
    type: Collaborator,
  })
  @ApiResponse({ status: 400, description: "Invalid input or missing image" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  create(
    @UploadedFile() file: Express.Multer.File, // Inject the uploaded file
    @Body() createCollaboratorDto: CreateCollaboratorDto,
  ) {
    if (!file) {
      throw new BadRequestException("Collaborator image is required");
    }
    return this.collaboratorsService.create(file, createCollaboratorDto); // Pass file to service
  }

  @Get()
  @ApiOperation({
    summary: "Get all collaborators",
    description: "Retrieve all collaborators across all events",
  })
  @ApiQuery({
    name: "eventId",
    required: false,
    description: "Filter collaborators by event ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "List of collaborators",
    type: [Collaborator],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  findAll(@Query("eventId") eventId?: string) {
    if (eventId) {
      return this.collaboratorsService.findByEvent(eventId); // Use findByEvent if eventId is provided
    } else {
      return this.collaboratorsService.findAll(); // Otherwise, get all
    }
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get collaborator by ID",
    description: "Retrieve a specific collaborator by their ID",
  })
  @ApiParam({
    name: "id",
    description: "Collaborator ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Collaborator found",
    type: Collaborator,
  })
  @ApiResponse({ status: 404, description: "Collaborator not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  findOne(@Param("id") id: string) {
    return this.collaboratorsService.findOne(id);
  }

  @Patch(":id")
  @RoleDecorator(UserRole.Admin)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({
    summary: "Update collaborator",
    description: "Update details of an existing collaborator",
  })
  @ApiConsumes("multipart/form-data")
  @ApiParam({
    name: "id",
    description: "Collaborator ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({
    description: "Collaborator details to update and optional new image",
    type: UpdateCollaboratorDto,
  })
  @ApiResponse({
    status: 200,
    description: "Collaborator updated successfully",
    type: Collaborator,
  })
  @ApiResponse({ status: 404, description: "Collaborator not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  update(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateCollaboratorDto: UpdateCollaboratorDto,
  ) {
    return this.collaboratorsService.update(id, file, updateCollaboratorDto);
  }

  @Delete(":id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Delete collaborator",
    description: "Remove a collaborator from an event",
  })
  @ApiParam({
    name: "id",
    description: "Collaborator ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Collaborator deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Collaborator not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  remove(@Param("id") id: string) {
    return this.collaboratorsService.remove(id);
  }
}
