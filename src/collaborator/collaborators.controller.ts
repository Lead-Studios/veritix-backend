import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { RolesGuard } from './guards/roles.guard';
import { MaxCollaboratorsGuard } from './guards/max-collaborator.guard';
import { Role } from './enum/role.enum';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { CollaboratorService } from './collaborators.service';
import { Roles } from './decorators/roles.decorator';

@ApiTags('collaborators')
@Controller('collaborators')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post()
  @UseGuards(MaxCollaboratorsGuard)
  @Roles(Role.ADMIN, Role.CONFERENCE_OWNER)
  @ApiOperation({ summary: 'Create a new collaborator' })
  @ApiResponse({ status: 201, description: 'The collaborator has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or max collaborators reached.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  create(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorService.create(createCollaboratorDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all collaborators' })
  @ApiResponse({ status: 200, description: 'Return all collaborators.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  findAll() {
    return this.collaboratorService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CONFERENCE_OWNER)
  @ApiOperation({ summary: 'Get a collaborator by id' })
  @ApiResponse({ status: 200, description: 'Return the collaborator.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Collaborator not found.' })
  findOne(@Param('id') id: string) {
    return this.collaboratorService.findOne(id);
  }

  @Get('conference/:conferenceId')
  @Roles(Role.ADMIN, Role.CONFERENCE_OWNER)
  @ApiOperation({ summary: 'Get all collaborators for a specific conference' })
  @ApiResponse({ status: 200, description: 'Return all collaborators for the conference.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  findByConference(@Param('conferenceId') conferenceId: string) {
    return this.collaboratorService.findByConferenceId(conferenceId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CONFERENCE_OWNER)
  @ApiOperation({ summary: 'Update a collaborator' })
  @ApiResponse({ status: 200, description: 'The collaborator has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Collaborator not found.' })
  update(@Param('id') id: string, @Body() updateCollaboratorDto: UpdateCollaboratorDto) {
    return this.collaboratorService.update(id, updateCollaboratorDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CONFERENCE_OWNER)
  @ApiOperation({ summary: 'Delete a collaborator' })
  @ApiResponse({ status: 200, description: 'The collaborator has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Collaborator not found.' })
  remove(@Param('id') id: string) {
    return this.collaboratorService.remove(id);
  }
}