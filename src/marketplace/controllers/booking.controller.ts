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
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { BookingQueryDto } from '../dto/booking-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.createBooking(createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get bookings with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(@Query() query: BookingQueryDto) {
    return this.bookingService.findBookings(query);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({ status: 200, description: 'User bookings retrieved successfully' })
  async getMyBookings(
    @GetUser('id') userId: string,
    @Query() query: BookingQueryDto,
  ) {
    query.organizerId = userId;
    return this.bookingService.findBookings(query);
  }

  @Get('vendor/:vendorId/upcoming')
  @ApiOperation({ summary: 'Get upcoming bookings for vendor' })
  @ApiResponse({ status: 200, description: 'Upcoming bookings retrieved successfully' })
  async getUpcomingBookings(
    @Param('vendorId') vendorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.bookingService.getUpcomingBookings(vendorId, limit);
  }

  @Get('vendor/:vendorId/calendar')
  @ApiOperation({ summary: 'Get vendor bookings calendar' })
  @ApiResponse({ status: 200, description: 'Calendar bookings retrieved successfully' })
  async getVendorCalendar(
    @Param('vendorId') vendorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.bookingService.getBookingsByDateRange(
      vendorId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string) {
    return this.bookingService.findBookingById(id);
  }

  @Get('number/:bookingNumber')
  @ApiOperation({ summary: 'Get booking by booking number' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findByNumber(@Param('bookingNumber') bookingNumber: string) {
    return this.bookingService.findBookingByNumber(bookingNumber);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking details' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.updateBooking(id, updateBookingDto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async confirm(@Param('id') id: string) {
    return this.bookingService.confirmBooking(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark booking as completed' })
  @ApiResponse({ status: 200, description: 'Booking completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string) {
    return this.bookingService.completeBooking(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('cancelledBy') cancelledBy: 'organizer' | 'vendor' | 'admin',
  ) {
    return this.bookingService.cancelBooking(id, reason, cancelledBy);
  }
}
