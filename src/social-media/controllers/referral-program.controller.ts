import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralProgram } from '../entities/referral-program.entity';
import { ReferralCode } from '../entities/referral-code.entity';
import { ReferralTracking } from '../entities/referral-tracking.entity';
import { 
  ReferralProgramService, 
  CreateReferralProgramDto, 
  CreateReferralCodeDto,
  ReferralConversionDto 
} from '../services/referral-program.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Referral Programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referral-programs')
export class ReferralProgramController {
  constructor(private readonly referralProgramService: ReferralProgramService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new referral program' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Referral program created successfully',
    type: ReferralProgram,
  })
  async createProgram(@Body() dto: CreateReferralProgramDto): Promise<ReferralProgram> {
    return this.referralProgramService.createProgram(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get referral program by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral program retrieved successfully',
    type: ReferralProgram,
  })
  async getProgram(@Param('id') id: string): Promise<ReferralProgram> {
    return this.referralProgramService.findProgramById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get referral programs by organizer or event' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral programs retrieved successfully',
    type: [ReferralProgram],
  })
  async getPrograms(
    @Query('organizerId') organizerId?: string,
    @Query('eventId') eventId?: string,
  ): Promise<ReferralProgram[]> {
    if (organizerId) {
      return this.referralProgramService.findProgramsByOrganizer(organizerId);
    }
    if (eventId) {
      return this.referralProgramService.findProgramsByEvent(eventId);
    }
    return [];
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update referral program status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Program status updated successfully',
    type: ReferralProgram,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<ReferralProgram> {
    return this.referralProgramService.updateProgramStatus(id, body.status as any);
  }

  @Post(':id/codes')
  @ApiOperation({ summary: 'Generate referral code for program' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Referral code generated successfully',
    type: ReferralCode,
  })
  async generateCode(
    @Param('id') programId: string,
    @Body() dto: Omit<CreateReferralCodeDto, 'programId'>,
  ): Promise<ReferralCode> {
    return this.referralProgramService.generateReferralCode({
      ...dto,
      programId,
    });
  }

  @Get('codes/:code')
  @ApiOperation({ summary: 'Get referral code by code string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral code retrieved successfully',
    type: ReferralCode,
  })
  async getCode(@Param('code') code: string): Promise<ReferralCode> {
    return this.referralProgramService.findCodeByCode(code);
  }

  @Get('users/:userId/codes')
  @ApiOperation({ summary: 'Get referral codes by user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User referral codes retrieved successfully',
    type: [ReferralCode],
  })
  async getUserCodes(@Param('userId') userId: string): Promise<ReferralCode[]> {
    return this.referralProgramService.findCodesByUser(userId);
  }

  @Post('track/:code')
  @ApiOperation({ summary: 'Track referral code click' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Referral click tracked successfully',
    type: ReferralTracking,
  })
  async trackClick(
    @Param('code') code: string,
    @Body() metadata: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    },
  ): Promise<ReferralTracking> {
    return this.referralProgramService.trackReferralClick(code, metadata);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Process referral conversion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral conversion processed successfully',
    type: ReferralTracking,
  })
  async processConversion(@Body() dto: ReferralConversionDto): Promise<ReferralTracking> {
    return this.referralProgramService.processReferralConversion(dto);
  }

  @Get('codes/:codeId/analytics')
  @ApiOperation({ summary: 'Get referral code analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral code analytics retrieved successfully',
  })
  async getCodeAnalytics(
    @Param('codeId') codeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.referralProgramService.getReferralAnalytics(codeId, dateRange);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get referral program analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral program analytics retrieved successfully',
  })
  async getProgramAnalytics(
    @Param('id') programId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.referralProgramService.getProgramAnalytics(programId, dateRange);
  }
}
