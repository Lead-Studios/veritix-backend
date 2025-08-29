import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HybridCheckInService, CheckInData } from '../services/hybrid-checkin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CheckInType } from '../enums/virtual-event.enum';

@ApiTags('Hybrid Check-In')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('virtual-events/:eventId/checkin')
export class HybridCheckInController {
  constructor(private readonly hybridCheckInService: HybridCheckInService) {}

  @Post('physical')
  @ApiOperation({ summary: 'Check in physically to event' })
  @ApiResponse({ status: 201, description: 'Physical check-in successful' })
  async checkInPhysical(@Param('eventId') eventId: string, @Body() checkInData: CheckInData) {
    return this.hybridCheckInService.checkInPhysical(eventId, checkInData);
  }

  @Post('virtual')
  @ApiOperation({ summary: 'Check in virtually to event' })
  @ApiResponse({ status: 201, description: 'Virtual check-in successful' })
  async checkInVirtual(@Param('eventId') eventId: string, @Body() checkInData: CheckInData) {
    return this.hybridCheckInService.checkInVirtual(eventId, checkInData);
  }

  @Post('hybrid')
  @ApiOperation({ summary: 'Check in with hybrid mode' })
  @ApiResponse({ status: 201, description: 'Hybrid check-in successful' })
  async checkInHybrid(@Param('eventId') eventId: string, @Body() checkInData: CheckInData) {
    return this.hybridCheckInService.checkInHybrid(eventId, checkInData);
  }

  @Post(':checkInId/checkout')
  @ApiOperation({ summary: 'Check out from event' })
  @ApiResponse({ status: 200, description: 'Check-out successful' })
  async checkOut(@Param('checkInId') checkInId: string) {
    return this.hybridCheckInService.checkOut(checkInId);
  }

  @Get()
  @ApiOperation({ summary: 'Get check-ins for event' })
  @ApiResponse({ status: 200, description: 'Check-ins retrieved successfully' })
  async getCheckIns(@Param('eventId') eventId: string, @Query('type') type?: CheckInType) {
    return this.hybridCheckInService.getCheckIns(eventId, type);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current check-ins' })
  @ApiResponse({ status: 200, description: 'Current check-ins retrieved successfully' })
  async getCurrentCheckIns(@Param('eventId') eventId: string) {
    return this.hybridCheckInService.getCurrentCheckIns(eventId);
  }

  @Get('user/:userId/history')
  @ApiOperation({ summary: 'Get user check-in history' })
  @ApiResponse({ status: 200, description: 'Check-in history retrieved successfully' })
  async getUserCheckInHistory(@Param('eventId') eventId: string, @Param('userId') userId: string) {
    return this.hybridCheckInService.getUserCheckInHistory(eventId, userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get check-in analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getCheckInAnalytics(@Param('eventId') eventId: string) {
    return this.hybridCheckInService.getCheckInAnalytics(eventId);
  }

  @Patch(':checkInId/verify')
  @ApiOperation({ summary: 'Verify attendee check-in' })
  @ApiResponse({ status: 200, description: 'Check-in verified successfully' })
  async verifyAttendee(@Param('checkInId') checkInId: string, @Body() verificationData: Record<string, any>) {
    return this.hybridCheckInService.verifyAttendee(checkInId, verificationData);
  }

  @Post('qr-code/:userId')
  @ApiOperation({ summary: 'Generate QR code for user' })
  @ApiResponse({ status: 201, description: 'QR code generated successfully' })
  async generateQRCode(@Param('eventId') eventId: string, @Param('userId') userId: string) {
    const qrCode = await this.hybridCheckInService.generateQRCode(eventId, userId);
    return { qrCode };
  }
}
