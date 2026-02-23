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
import { VerificationService } from './verification.service';
import { VerifyTicketDto, CheckInDto } from './dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { User } from '../auth/entities/user.entity';
import type { VerificationResult, VerificationStats } from './interfaces/verification.interface';
import type { VerificationLog } from './interfaces/verification.interface';

/**
 * Verification Controller for VeriTix
 *
 * Handles ticket verification HTTP endpoints. All business logic is delegated
 * to VerificationService. Returns 200 for valid/success, 422 for invalid ticket states.
 */
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
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
  async peek(@Param('ticketCode') ticketCode: string): Promise<VerificationResult> {
    const result = await this.verificationService.peek(ticketCode);
    if (!result.isValid) {
      throw new UnprocessableEntityException(result);
    }
    return result;
  }

  @Get('stats/:eventId')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<VerificationStats> {
    return this.verificationService.getStatsForEvent(eventId);
  }

  @Get('logs/:eventId')
  @UseGuards(JwtAuthGuard)
  async getLogs(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<VerificationLog[]> {
    return this.verificationService.getLogsForEvent(eventId);
  }
}
