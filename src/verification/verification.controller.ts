import {
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
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { User } from '../auth/entities/user.entity';
import type {
  VerificationResult,
  VerificationStats,
} from './interfaces/verification.interface';
import type { VerificationLog } from './interfaces/verification.interface';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify a ticket code (organizer or admin only)' })
  @ApiResponse({ status: 200, description: 'Ticket is valid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
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
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check in an attendee by ticket code (organizer or admin only)',
  })
  @ApiResponse({ status: 200, description: 'Attendee checked in successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – organizer or admin role required',
  })
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
  })
  @ApiParam({
    name: 'ticketCode',
    type: String,
    description: 'The ticket code to inspect',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get verification statistics for an event' })
  @ApiParam({ name: 'eventId', type: String, description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Verification statistics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getStats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<VerificationStats> {
    return this.verificationService.getStatsForEvent(eventId);
  }

  @Get('logs/:eventId')
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
  }
}
