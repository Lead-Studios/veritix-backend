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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from "@nestjs/swagger";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";
import { UpdateCollaboratorDto } from "./dto/update-collaborator.dto";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";
import { Collaborator } from "./entities/collaborator.entity";
import { CollaboratorService } from "./collaborators.service";

@ApiTags("Collaborators")
@ApiBearerAuth()
@Controller("collaborators")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CollaboratorController {
  constructor(private readonly collaboratorsService: CollaboratorService) {}

  @Post()
  @RoleDecorator(UserRole.Admin)
  @UseInterceptors(FileInterceptor("image"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create collaborator",
    description: "Add a new collaborator to an event",
  })
  @ApiResponse({
    status: 201,
    description: "Collaborator created successfully",
    type: Collaborator,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createCollaboratorDto: CreateCollaboratorDto,
  ) {
    return this.collaboratorsService.create(createCollaboratorDto, file);
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
      return this.collaboratorsService.findByEvent(eventId);
    }
    return this.collaboratorsService.findAll();
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
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update collaborator",
    description: "Update details of an existing collaborator",
  })
  @ApiParam({
    name: "id",
    description: "Collaborator ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
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
    const updateData = { ...updateCollaboratorDto, file };
    return this.collaboratorsService.update(id, updateData);
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