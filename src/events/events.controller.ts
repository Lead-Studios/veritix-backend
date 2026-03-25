import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '../enums/event-status.enum';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { User } from '../auth/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { CurrentUser } from 'src/auth/decorators/current.user.decorators';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { EventQueryDto } from './dto/event-query.dto';
import { OptionalJwtAuthGuard } from 'src/auth/guard/optional-jwt.auth.guard';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // -------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List all published events (admins can include all statuses)',
  })
  @ApiQuery({
    name: 'includeAll',
    required: false,
    type: Boolean,
    description: 'Include all event statuses (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of events returned',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – only admins can use includeAll',
  })
  async getAll(
    @Query() query: EventQueryDto,
    @Query('includeAll') includeAllStr?: string,
    @CurrentUser() user?: User,
  ) {
    let includeAll = includeAllStr === 'true';

    if (includeAll) {
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only admins can query with includeAll');
      }
    } else {
      includeAll = false;
    }

    return this.eventsService.findAll(query, includeAll);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event returned successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getEventById(id);
  }

  // -------------------------------
  // PROTECTED ENDPOINTS
  // -------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new event (organizer or admin only)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.createEvent(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an event (organizer or admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – must be event owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.updateEvent(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change the status of an event (organizer or admin only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: EventStatus,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.changeStatus(id, status, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an event (organizer or admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – must be event owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.eventsService.deleteEvent(id, user);
    return { message: 'Event deleted successfully' };
  }
}
