import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CheckInDto } from './dto/check-in.dto';
import { VerificationStatus } from './enums/verification-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  async checkIn(@Body() checkInDto: CheckInDto): Promise<{ status: VerificationStatus }> {
    const status = await this.verificationService.verifyTicket(
      checkInDto.ticketCode,
      true,
      checkInDto.verifiedBy,
    );
    return { status };
  }
}