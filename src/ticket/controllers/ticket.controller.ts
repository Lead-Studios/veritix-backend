import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TicketService } from '../services/ticket.service';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { UpdateTicketDto } from '../dtos/update-ticket.dto';
import { CreatePromoCodeDto } from '../dtos/create-promo-code.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Ticket')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiBody({ type: CreateTicketDto })
  @Roles('admin')
  create(@Body() dto: CreateTicketDto, @Req() req) {
    const createdById = dto.createdById || req.user?.userId;
    return this.ticketService.create({ ...dto, createdById });
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all tickets' })
  findAll() {
    return this.ticketService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single ticket' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id') id: string) {
    return this.ticketService.findOne(id);
  }

  @Get('/events/:eventId')
  @ApiOperation({ summary: 'Retrieve all tickets for a specific event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.ticketService.findByEvent(eventId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing ticket' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateTicketDto })
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ticket' })
  @ApiParam({ name: 'id', type: 'string' })
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.ticketService.remove(id);
  }

  @Post('/events/:eventId/promo-codes')
  @ApiOperation({ summary: 'Create a promo code for an event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiBody({ type: CreatePromoCodeDto })
  @Roles('admin')
  createPromoCode(
    @Param('eventId') eventId: string,
    @Body() dto: CreatePromoCodeDto,
  ) {
    return this.ticketService.createPromoCode(eventId, dto);
  }

  @Post('/apply-code')
  @ApiOperation({ summary: 'Apply a promo code' })
  applyPromoCode(@Body() body: { eventId: string; code: string }) {
    return this.ticketService.applyPromoCode(body.eventId, body.code);
  }
}
