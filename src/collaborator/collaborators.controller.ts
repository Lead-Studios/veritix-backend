import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Query 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CollaboratorsService } from './collaborators.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { Collaborator } from './entities/collaborator.entity';

@ApiTags('Collaborators')
@ApiBearerAuth()
@Controller('collaborators')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post()
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({ 
    summary: 'Create collaborator', 
    description: 'Add a new collaborator to an event'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Collaborator created successfully',
    type: Collaborator
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
  create(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorsService.create(createCollaboratorDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all collaborators', 
    description: 'Retrieve all collaborators across all events'
  })
  @ApiQuery({
    name: 'eventId',
    required: false,
    description: 'Filter collaborators by event ID',
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of collaborators',
    type: [Collaborator]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query('eventId') eventId?: string) {
    return this.collaboratorsService.findAll(eventId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get collaborator by ID', 
    description: 'Retrieve a specific collaborator by their ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Collaborator ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Collaborator found',
    type: Collaborator
  })
  @ApiResponse({ status: 404, description: 'Collaborator not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.collaboratorsService.findOne(id);
  }

  @Patch(':id')
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({ 
    summary: 'Update collaborator', 
    description: 'Update details of an existing collaborator'
  })
  @ApiParam({
    name: 'id',
    description: 'Collaborator ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Collaborator updated successfully',
    type: Collaborator
  })
  @ApiResponse({ status: 404, description: 'Collaborator not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
  update(@Param('id') id: string, @Body() updateCollaboratorDto: UpdateCollaboratorDto) {
    return this.collaboratorsService.update(id, updateCollaboratorDto);
  }

  @Delete(':id')
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({ 
    summary: 'Delete collaborator', 
    description: 'Remove a collaborator from an event'
  })
  @ApiParam({
    name: 'id',
    description: 'Collaborator ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Collaborator deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collaborator not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
  remove(@Param('id') id: string) {
    return this.collaboratorsService.remove(id);
  }
}