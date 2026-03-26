import {
<<<<<<< Updated upstream
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnprocessableEntityException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { VerifyTicketDto, CheckInDto } from './dto';
=======
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CheckInDto, VerificationQueryDto, VerifyTicketDto } from './dto';
>>>>>>> Stashed changes
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { User } from '../auth/entities/user.entity';
import type {
<<<<<<< Updated upstream
  VerificationResult,
  VerificationStats,
} from './interfaces/verification.interface';
import type { VerificationLog } from './interfaces/verification.interface';

@ApiTags('Verification')
=======
  VerificationLog,
  VerificationResult,
  VerificationStats,
} from './interfaces/verification.interface';

@ApiTags('verification')
>>>>>>> Stashed changes
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
<<<<<<< Updated upstream
  @ApiOperation({ summary: 'Verify a ticket code (organizer or admin only)' })
  @ApiResponse({ status: 200, description: 'Ticket is valid' })
=======
  @ApiOperation({ summary: 'Verify a ticket code' })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
>>>>>>> Stashed changes
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
<<<<<<< Updated upstream
  @ApiResponse({
    status: 422,
    description: 'Ticket is invalid, already used, expired, or for wrong event',
  })
  async verify(
    @Body() dto: VerifyTicketDto,
    @CurrentUser() user: User,
  ): Promise<VerificationResult> {
    const result = await this.verificationService.verifyTicket({
      ticketCode: dto.ticketCode,
      eventId: dto.eventId,
      verifierId: dto.verifierId ?? user.id,
      markAsUsed: dto.markAsUsed ?? false,
    });
    if (!result.isValid) {
      throw new UnprocessableEntityException(result);
    }
    return result;
=======
  verify(
    @Body() dto: VerifyTicketDto,
    @CurrentUser() user: User,
  ): Promise<VerificationResult> {
    return this.verificationService.verifyTicket({
      ticketCode: dto.ticketCode,
      eventId: dto.eventId,
      verifierId: dto.verifierId ?? String(user.id),
      markAsUsed: dto.markAsUsed ?? false,
    });
>>>>>>> Stashed changes
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
<<<<<<< Updated upstream
  @ApiOperation({
    summary: 'Check in an attendee by ticket code (organizer or admin only)',
  })
  @ApiResponse({ status: 200, description: 'Attendee checked in successfully' })
=======
  @ApiOperation({ summary: 'Verify a ticket and mark it as used' })
  @ApiResponse({ status: 200, description: 'Check-in result returned' })
>>>>>>> Stashed changes
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
<<<<<<< Updated upstream
  @ApiResponse({
    status: 422,
    description: 'Ticket is invalid or attendee already checked in',
  })
  async checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: User,
  ): Promise<VerificationResult> {
    const result = await this.verificationService.checkIn(
      dto.ticketCode,
      dto.verifierId ?? user.id,
    );
    if (!result.isValid) {
      throw new UnprocessableEntityException(result);
    }
    return result;
  }

  @Get('peek/:ticketCode')
  @ApiOperation({
    summary: 'Preview ticket validity without marking it as used (public)',
=======
  checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: User,
  ): Promise<VerificationResult> {
    return this.verificationService.verifyTicket({
      ticketCode: dto.ticketCode,
      verifierId: dto.verifierId ?? String(user.id),
      markAsUsed: true,
    });
  }

  @Get('peek/:ticketCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify a ticket without marking it as used',
>>>>>>> Stashed changes
  })
  @ApiParam({
    name: 'ticketCode',
    type: String,
    description: 'The ticket code to inspect',
  })
<<<<<<< Updated upstream
  @ApiResponse({ status: 200, description: 'Ticket validity result returned' })
  @ApiResponse({ status: 422, description: 'Ticket is invalid or expired' })
  async peek(
    @Param('ticketCode') ticketCode: string,
  ): Promise<VerificationResult> {
    const result = await this.verificationService.peek(ticketCode);
    if (!result.isValid) {
      throw new UnprocessableEntityException(result);
    }
    return result;
  }

  @Get('stats/:eventId')
  @UseGuards(JwtAuthGuard)
=======
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  peek(@Param('ticketCode') ticketCode: string): Promise<VerificationResult> {
    return this.verificationService.peek(ticketCode);
  }

  @Get('stats/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
>>>>>>> Stashed changes
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get verification statistics for an event' })
  @ApiParam({ name: 'eventId', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Verification statistics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< Updated upstream
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getStats(
=======
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
  getStats(
>>>>>>> Stashed changes
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<VerificationStats> {
    return this.verificationService.getStatsForEvent(eventId);
  }

  @Get('logs/:eventId')
<<<<<<< Updated upstream
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all verification logs for an event' })
  @ApiParam({ name: 'eventId', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Verification logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getLogs(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<VerificationLog[]> {
    return this.verificationService.getLogsForEvent(eventId);
=======
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get paginated verification logs for an event' })
  @ApiParam({ name: 'eventId', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Verification logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
  async getLogs(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: VerificationQueryDto,
  ): Promise<{
    items: VerificationLog[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const logs = await this.verificationService.getLogsForEvent(eventId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const start = (page - 1) * limit;

    return {
      items: logs.slice(start, start + limit),
      meta: {
        page,
        limit,
        total: logs.length,
        totalPages: Math.ceil(logs.length / limit) || 1,
      },
    };
>>>>>>> Stashed changes
  }
}
