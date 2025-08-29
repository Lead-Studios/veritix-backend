import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VirtualEventService } from '../services/virtual-event.service';
import { CreateVirtualEventDto } from '../dto/create-virtual-event.dto';
import { UpdateVirtualEventDto } from '../dto/update-virtual-event.dto';
import { CreateVirtualTicketDto } from '../dto/create-virtual-ticket.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Virtual Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('virtual-events')
export class VirtualEventController {
  constructor(private readonly virtualEventService: VirtualEventService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new virtual event' })
  @ApiResponse({ status: 201, description: 'Virtual event created successfully' })
  async create(@Body() createVirtualEventDto: CreateVirtualEventDto) {
    return this.virtualEventService.create(createVirtualEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all virtual events' })
  @ApiResponse({ status: 200, description: 'Virtual events retrieved successfully' })
  async findAll(@Query('eventId') eventId?: string) {
    return this.virtualEventService.findAll(eventId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a virtual event by ID' })
  @ApiResponse({ status: 200, description: 'Virtual event retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.virtualEventService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a virtual event' })
  @ApiResponse({ status: 200, description: 'Virtual event updated successfully' })
  async update(@Param('id') id: string, @Body() updateVirtualEventDto: UpdateVirtualEventDto) {
    return this.virtualEventService.update(id, updateVirtualEventDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a virtual event' })
  @ApiResponse({ status: 204, description: 'Virtual event deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.virtualEventService.remove(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a virtual event' })
  @ApiResponse({ status: 200, description: 'Virtual event started successfully' })
  async startEvent(@Param('id') id: string) {
    return this.virtualEventService.startEvent(id);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a virtual event' })
  @ApiResponse({ status: 200, description: 'Virtual event ended successfully' })
  async endEvent(@Param('id') id: string) {
    return this.virtualEventService.endEvent(id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a virtual event' })
  @ApiResponse({ status: 200, description: 'Joined virtual event successfully' })
  async joinEvent(
    @Param('id') id: string,
    @Body() joinData: { userId: string; guestInfo?: { name: string; email: string } },
  ) {
    return this.virtualEventService.joinEvent(id, joinData.userId, joinData.guestInfo);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a virtual event' })
  @ApiResponse({ status: 200, description: 'Left virtual event successfully' })
  async leaveEvent(@Param('id') id: string, @Body() leaveData: { userId: string }) {
    return this.virtualEventService.leaveEvent(id, leaveData.userId);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Get event attendees' })
  @ApiResponse({ status: 200, description: 'Attendees retrieved successfully' })
  async getAttendees(@Param('id') id: string, @Query('current') current?: boolean) {
    if (current) {
      return this.virtualEventService.getCurrentAttendees(id);
    }
    return this.virtualEventService.getEventAttendees(id);
  }

  @Patch(':id/attendees/:userId')
  @ApiOperation({ summary: 'Update attendee status' })
  @ApiResponse({ status: 200, description: 'Attendee status updated successfully' })
  async updateAttendeeStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updates: any,
  ) {
    return this.virtualEventService.updateAttendeeStatus(id, userId, updates);
  }

  @Post(':id/tickets/generate')
  @ApiOperation({ summary: 'Generate virtual tickets' })
  @ApiResponse({ status: 201, description: 'Virtual tickets generated successfully' })
  async generateTickets(
    @Param('id') id: string,
    @Body() generateData: { count: number; ticketData: CreateVirtualTicketDto },
  ) {
    return this.virtualEventService.generateVirtualTickets(id, generateData.count, generateData.ticketData);
  }

  @Post('tickets/validate')
  @ApiOperation({ summary: 'Validate a virtual ticket' })
  @ApiResponse({ status: 200, description: 'Ticket validated successfully' })
  async validateTicket(@Body() validateData: { ticketNumber: string; accessToken: string }) {
    return this.virtualEventService.validateVirtualTicket(validateData.ticketNumber, validateData.accessToken);
  }
}
