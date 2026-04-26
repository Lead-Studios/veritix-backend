import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CheckInDto } from './dto/check-in.dto';
import { VerificationStatus } from './enums/verification-status.enum';
import { VerificationQueryDto } from './dto/verification-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  async checkIn(
    @Body() checkInDto: CheckInDto,
  ): Promise<{ status: VerificationStatus }> {
    const status = await this.verificationService.verifyTicket(
      checkInDto.ticketCode,
      true,
      checkInDto.verifiedBy,
    );
    return { status };
  }

  @Get('logs/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  async getLogs(
    @Param('eventId') eventId: string,
    @Query() query: VerificationQueryDto,
    @CurrentUser() _user: User,
  ) {
    return this.verificationService.getLogs(eventId, query);
  }
}
