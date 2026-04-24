import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationQueryDto } from './dto/verification-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('logs/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  async getLogs(
    @Param('eventId') eventId: string,
    @Query() query: VerificationQueryDto,
    @CurrentUser() user: User,
  ) {
    return await this.verificationService.getLogs(eventId, query);
  }
}
