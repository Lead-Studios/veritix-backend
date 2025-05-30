import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { SponsorsService } from './providers/sponsors.service';
import { CreateSponsorDto } from './dtos/create-sponsor.dto';
import { UpdateSponsorDto } from './dtos/update-sponsor.dto';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { Sponsor } from './sponsor.entity';

@ApiTags('Sponsors')
@ApiBearerAuth()
@Controller('sponsors')
export class SponsorsController {
    constructor(private readonly sponsorsService: SponsorsService) {}

    @Post()
    @RoleDecorator(UserRole.Admin)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ 
      summary: 'Create sponsor', 
      description: 'Add a new sponsor to an event'
    })
    @ApiBody({ type: CreateSponsorDto })
    @ApiResponse({ 
      status: 201, 
      description: 'Sponsor created successfully',
      type: Sponsor
    })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
    async createSponsors(@Body() createSponsorDto: CreateSponsorDto) {
        return this.sponsorsService.createSponsors(createSponsorDto);
    }

    @Get()
    @ApiOperation({ 
      summary: 'Get all sponsors', 
      description: 'Retrieve all sponsors across all events'
    })
    @ApiResponse({ 
      status: 200, 
      description: 'List of all sponsors',
      type: [Sponsor]
    })
    async findAllSponsors() {
        return this.sponsorsService.findAllSponsors();
    }

    @Get(':id')
    @ApiOperation({ 
      summary: 'Get sponsor by ID', 
      description: 'Retrieve a specific sponsor by their ID'
    })
    @ApiParam({
      name: 'id',
      description: 'ID of the sponsor',
      type: 'number',
      example: 1
    })
    @ApiResponse({ 
      status: 200, 
      description: 'Sponsor found',
      type: Sponsor
    })
    @ApiResponse({ status: 404, description: 'Sponsor not found' })
    async findOneSponsor(@Param('id') id: number) {
        return this.sponsorsService.findOneSponsor(id);
    }

    @Get('/events/:eventId')
    @ApiOperation({ 
      summary: 'Get sponsors by event', 
      description: 'Retrieve all sponsors for a specific event'
    })
    @ApiParam({
      name: 'eventId',
      description: 'ID of the event',
      type: 'number',
      example: 1
    })
    @ApiResponse({ 
      status: 200, 
      description: 'List of sponsors for the event',
      type: [Sponsor]
    })
    @ApiResponse({ status: 404, description: 'Event not found' })
    async findSponsorsByEvent(@Param('eventId') eventId: number) {
        return this.sponsorsService.findSponsorsByEvent(eventId);
    }

    @Put(':id')
    @RoleDecorator(UserRole.Admin)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ 
      summary: 'Update sponsor', 
      description: 'Update details of an existing sponsor'
    })
    @ApiParam({
      name: 'id',
      description: 'ID of the sponsor to update',
      type: 'number',
      example: 1
    })
    @ApiBody({ type: UpdateSponsorDto })
    @ApiResponse({ 
      status: 200, 
      description: 'Sponsor updated successfully',
      type: Sponsor
    })
    @ApiResponse({ status: 404, description: 'Sponsor not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
    async update(@Param('id') id: number, @Body() updateSponsorDto: UpdateSponsorDto) {
        return this.sponsorsService.updateSponsor(id, updateSponsorDto);
    }

    @Delete(':id')
    @RoleDecorator(UserRole.Admin)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ 
      summary: 'Delete sponsor', 
      description: 'Remove a sponsor from the system'
    })
    @ApiParam({
      name: 'id',
      description: 'ID of the sponsor to delete',
      type: 'number',
      example: 1
    })
    @ApiResponse({ status: 200, description: 'Sponsor deleted successfully' })
    @ApiResponse({ status: 404, description: 'Sponsor not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
    async remove(@Param('id') id: number) {
        return this.sponsorsService.removeSponsor(id);
    }
}
