import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Headers,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplePassKitService } from '../services/apple-passkit.service';
import { GooglePayService } from '../services/google-pay.service';
import { PassTemplateService } from '../services/pass-template.service';
import { QRCodeService } from '../services/qr-code.service';
import { PassUpdateService } from '../services/pass-update.service';
import { GeolocationNotificationService } from '../services/geolocation-notification.service';
import { PassSharingService } from '../services/pass-sharing.service';
import { PassAnalyticsService } from '../services/pass-analytics.service';
import { WalletPass, PassType } from '../entities/wallet-pass.entity';
import {
  CreatePassDto,
  UpdatePassDto,
  SharePassDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  LocationTriggerDto,
  BeaconTriggerDto,
  QRValidationDto,
} from '../dto/mobile-wallet.dto';

@ApiTags('Mobile Wallet')
@Controller('mobile-wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MobileWalletController {
  constructor(
    private readonly applePassKitService: ApplePassKitService,
    private readonly googlePayService: GooglePayService,
    private readonly passTemplateService: PassTemplateService,
    private readonly qrCodeService: QRCodeService,
    private readonly passUpdateService: PassUpdateService,
    private readonly geolocationService: GeolocationNotificationService,
    private readonly passSharingService: PassSharingService,
    private readonly passAnalyticsService: PassAnalyticsService,
  ) {}

  // Pass Management Endpoints

  @Post('passes')
  @ApiOperation({ summary: 'Create a new wallet pass' })
  @ApiResponse({ status: 201, description: 'Pass created successfully' })
  async createPass(@Body() createPassDto: CreatePassDto, @Req() req: Request) {
    const userId = req.user?.['id'];
    
    if (createPassDto.passType === PassType.APPLE_WALLET) {
      return await this.applePassKitService.generatePass(
        createPassDto.ticketId,
        createPassDto.templateId,
        createPassDto.customData
      );
    } else if (createPassDto.passType === PassType.GOOGLE_PAY) {
      return await this.googlePayService.generatePass(
        createPassDto.ticketId,
        createPassDto.templateId,
        createPassDto.customData
      );
    }

    throw new BadRequestException('Unsupported pass type');
  }

  @Get('passes/:id')
  @ApiOperation({ summary: 'Get pass details' })
  @ApiResponse({ status: 200, description: 'Pass details retrieved' })
  async getPass(@Param('id') passId: string) {
    // Implementation would get pass from repository
    return { passId, status: 'active' };
  }

  @Put('passes/:id')
  @ApiOperation({ summary: 'Update wallet pass' })
  @ApiResponse({ status: 200, description: 'Pass updated successfully' })
  async updatePass(
    @Param('id') passId: string,
    @Body() updatePassDto: UpdatePassDto
  ) {
    return await this.passUpdateService.scheduleBulkUpdate({
      passIds: [passId],
      updateType: updatePassDto.updateType,
      updateData: updatePassDto.updateData,
      priority: 'normal',
    });
  }

  @Delete('passes/:id')
  @ApiOperation({ summary: 'Revoke wallet pass' })
  @ApiResponse({ status: 200, description: 'Pass revoked successfully' })
  async revokePass(@Param('id') passId: string) {
    const appleResult = await this.applePassKitService.revokePass(passId);
    const googleResult = await this.googlePayService.revokePass(passId);

    return {
      success: appleResult || googleResult,
      apple: appleResult,
      google: googleResult,
    };
  }

  @Get('passes/:id/download')
  @ApiOperation({ summary: 'Download wallet pass file' })
  @ApiResponse({ status: 200, description: 'Pass file downloaded' })
  async downloadPass(@Param('id') passId: string, @Res() res: Response) {
    const result = await this.applePassKitService.generatePass(passId);
    
    if (result.success && result.passBuffer) {
      res.set({
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="pass-${passId}.pkpass"`,
      });
      res.send(result.passBuffer);
    } else {
      throw new NotFoundException('Pass not found or could not be generated');
    }
  }

  // QR Code Endpoints

  @Get('passes/:id/qr-code')
  @ApiOperation({ summary: 'Get QR code for pass' })
  @ApiResponse({ status: 200, description: 'QR code generated' })
  async getPassQRCode(
    @Param('id') passId: string,
    @Query('size') size?: number,
    @Res() res: Response
  ) {
    const result = await this.qrCodeService.generateQRCodeImage(passId, {
      size: size || 512,
    });

    if (result.success && result.imageBuffer) {
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      });
      res.send(result.imageBuffer);
    } else {
      throw new NotFoundException('QR code could not be generated');
    }
  }

  @Post('qr-code/validate')
  @ApiOperation({ summary: 'Validate QR code' })
  @ApiResponse({ status: 200, description: 'QR code validation result' })
  async validateQRCode(@Body() validationDto: QRValidationDto) {
    return await this.qrCodeService.validateQRCode(
      validationDto.qrData,
      validationDto.scanLocation
    );
  }

  @Get('passes/:id/qr-analytics')
  @ApiOperation({ summary: 'Get QR code analytics for pass' })
  @ApiResponse({ status: 200, description: 'QR analytics retrieved' })
  async getQRAnalytics(
    @Param('id') passId: string,
    @Query('days') days?: number
  ) {
    return await this.qrCodeService.getQRCodeAnalytics(passId, days || 30);
  }

  // Template Management Endpoints

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Create pass template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto, @Req() req: Request) {
    const organizerId = req.user?.['id'];
    return await this.passTemplateService.createTemplate({
      ...createTemplateDto,
      organizerId,
    });
  }

  @Get('templates')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Get templates for organizer' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  async getTemplates(
    @Req() req: Request,
    @Query('passType') passType?: PassType,
    @Query('status') status?: string
  ) {
    const organizerId = req.user?.['id'];
    return await this.passTemplateService.getTemplatesByOrganizer(
      organizerId,
      passType,
      status as any
    );
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details retrieved' })
  async getTemplate(@Param('id') templateId: string) {
    return await this.passTemplateService.getTemplate(templateId);
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id') templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto
  ) {
    return await this.passTemplateService.updateTemplate(templateId, updateTemplateDto);
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Param('id') templateId: string) {
    await this.passTemplateService.deleteTemplate(templateId);
    return { success: true };
  }

  @Post('templates/:id/clone')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Clone template' })
  @ApiResponse({ status: 201, description: 'Template cloned successfully' })
  async cloneTemplate(
    @Param('id') templateId: string,
    @Body('name') newName: string,
    @Req() req: Request
  ) {
    const organizerId = req.user?.['id'];
    return await this.passTemplateService.cloneTemplate(templateId, newName, organizerId);
  }

  @Get('templates/:id/preview')
  @ApiOperation({ summary: 'Preview template with sample data' })
  @ApiResponse({ status: 200, description: 'Template preview generated' })
  async previewTemplate(
    @Param('id') templateId: string,
    @Body() sampleData?: any
  ) {
    return await this.passTemplateService.previewTemplate(templateId, sampleData);
  }

  @Get('templates/:id/usage')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Get template usage statistics' })
  @ApiResponse({ status: 200, description: 'Template usage retrieved' })
  async getTemplateUsage(@Param('id') templateId: string) {
    return await this.passTemplateService.getTemplateUsage(templateId);
  }

  // Pass Sharing Endpoints

  @Post('passes/:id/share')
  @ApiOperation({ summary: 'Share pass with others' })
  @ApiResponse({ status: 200, description: 'Pass shared successfully' })
  async sharePass(
    @Param('id') passId: string,
    @Body() sharePassDto: SharePassDto
  ) {
    return await this.passSharingService.sharePass({
      passId,
      ...sharePassDto,
    });
  }

  @Get('shared/:token')
  @ApiOperation({ summary: 'Access shared pass' })
  @ApiResponse({ status: 200, description: 'Shared pass accessed' })
  async accessSharedPass(
    @Param('token') shareToken: string,
    @Query('email') accessorEmail: string,
    @Req() req: Request
  ) {
    return await this.passSharingService.accessSharedPass(shareToken, {
      accessedBy: accessorEmail,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Delete('passes/:id/share')
  @ApiOperation({ summary: 'Revoke pass sharing' })
  @ApiResponse({ status: 200, description: 'Pass sharing revoked' })
  async revokePassSharing(
    @Param('id') passId: string,
    @Query('revokeAll') revokeAll?: boolean
  ) {
    return await this.passSharingService.revokePassSharing(passId, revokeAll === true);
  }

  @Get('passes/:id/sharing-analytics')
  @ApiOperation({ summary: 'Get pass sharing analytics' })
  @ApiResponse({ status: 200, description: 'Sharing analytics retrieved' })
  async getSharingAnalytics(@Param('id') passId: string) {
    return await this.passSharingService.getSharingAnalytics(passId);
  }

  // Location & Beacon Endpoints

  @Post('location-trigger')
  @ApiOperation({ summary: 'Process location trigger' })
  @ApiResponse({ status: 200, description: 'Location trigger processed' })
  async processLocationTrigger(
    @Body() locationTriggerDto: LocationTriggerDto,
    @Req() req: Request
  ) {
    const userId = req.user?.['id'];
    return await this.geolocationService.processLocationTrigger({
      ...locationTriggerDto,
      userId,
      triggeredAt: new Date(),
    });
  }

  @Post('beacon-trigger')
  @ApiOperation({ summary: 'Process beacon trigger' })
  @ApiResponse({ status: 200, description: 'Beacon trigger processed' })
  async processBeaconTrigger(
    @Body() beaconTriggerDto: BeaconTriggerDto,
    @Req() req: Request
  ) {
    const userId = req.user?.['id'];
    return await this.geolocationService.processBeaconTrigger({
      ...beaconTriggerDto,
      userId,
      triggeredAt: new Date(),
    });
  }

  @Get('passes/:id/location-analytics')
  @ApiOperation({ summary: 'Get location analytics for pass' })
  @ApiResponse({ status: 200, description: 'Location analytics retrieved' })
  async getLocationAnalytics(
    @Param('id') passId: string,
    @Query('days') days?: number
  ) {
    return await this.geolocationService.getLocationAnalytics(passId, days || 30);
  }

  // Analytics Endpoints

  @Get('analytics/overview')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Get analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved' })
  async getAnalyticsOverview(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const organizerId = req.user?.['role'] === 'admin' ? undefined : req.user?.['id'];
    const timeRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    } : undefined;

    return await this.passAnalyticsService.getAnalyticsOverview(organizerId, timeRange);
  }

  @Get('analytics/engagement')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Get engagement metrics' })
  @ApiResponse({ status: 200, description: 'Engagement metrics retrieved' })
  async getEngagementMetrics(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const organizerId = req.user?.['role'] === 'admin' ? undefined : req.user?.['id'];
    const timeRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    } : undefined;

    return await this.passAnalyticsService.getEngagementMetrics(organizerId, timeRange);
  }

  @Get('analytics/passes/:id/performance')
  @ApiOperation({ summary: 'Get pass performance report' })
  @ApiResponse({ status: 200, description: 'Pass performance report retrieved' })
  async getPassPerformance(@Param('id') passId: string) {
    return await this.passAnalyticsService.getPassPerformanceReport(passId);
  }

  @Get('analytics/templates/:id')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Get template analytics' })
  @ApiResponse({ status: 200, description: 'Template analytics retrieved' })
  async getTemplateAnalytics(@Param('id') templateId: string) {
    return await this.passAnalyticsService.getTemplateAnalytics(templateId);
  }

  @Get('analytics/comparative')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Get comparative analytics' })
  @ApiResponse({ status: 200, description: 'Comparative analytics retrieved' })
  async getComparativeAnalytics(
    @Req() req: Request,
    @Query('currentStart') currentStart?: string,
    @Query('currentEnd') currentEnd?: string,
    @Query('previousStart') previousStart?: string,
    @Query('previousEnd') previousEnd?: string
  ) {
    const organizerId = req.user?.['role'] === 'admin' ? undefined : req.user?.['id'];
    
    const currentPeriod = currentStart && currentEnd ? {
      startDate: new Date(currentStart),
      endDate: new Date(currentEnd),
    } : undefined;

    const previousPeriod = previousStart && previousEnd ? {
      startDate: new Date(previousStart),
      endDate: new Date(previousEnd),
    } : undefined;

    return await this.passAnalyticsService.getComparativeAnalytics(
      organizerId,
      currentPeriod,
      previousPeriod
    );
  }

  @Get('analytics/export')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics data exported' })
  async exportAnalytics(
    @Req() req: Request,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res: Response
  ) {
    const organizerId = req.user?.['role'] === 'admin' ? undefined : req.user?.['id'];
    const timeRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    } : undefined;

    const result = await this.passAnalyticsService.exportAnalyticsData(
      organizerId,
      timeRange,
      format
    );

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });

    if (format === 'json') {
      res.json(result.data);
    } else {
      res.send(result.data);
    }
  }

  // Bulk Operations

  @Post('passes/bulk-create')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Bulk create passes' })
  @ApiResponse({ status: 200, description: 'Bulk pass creation initiated' })
  async bulkCreatePasses(
    @Body() bulkCreateDto: {
      ticketIds: string[];
      passType: PassType;
      templateId?: string;
    }
  ) {
    const results = [];
    
    for (const ticketId of bulkCreateDto.ticketIds) {
      try {
        let result;
        if (bulkCreateDto.passType === PassType.APPLE_WALLET) {
          result = await this.applePassKitService.generatePass(ticketId, bulkCreateDto.templateId);
        } else {
          result = await this.googlePayService.generatePass(ticketId, bulkCreateDto.templateId);
        }
        
        results.push({
          ticketId,
          success: result.success,
          passUrl: result.success ? result.downloadUrl || result.saveUrl : undefined,
          error: result.error,
        });
      } catch (error) {
        results.push({
          ticketId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.every(r => r.success),
      results,
      summary: {
        total: bulkCreateDto.ticketIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }

  @Post('passes/bulk-update')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiOperation({ summary: 'Bulk update passes' })
  @ApiResponse({ status: 200, description: 'Bulk pass update initiated' })
  async bulkUpdatePasses(
    @Body() bulkUpdateDto: {
      passIds: string[];
      updateData: any;
      scheduledFor?: string;
    }
  ) {
    return await this.passUpdateService.scheduleBulkUpdate({
      passIds: bulkUpdateDto.passIds,
      updateType: 'FIELD_UPDATE' as any,
      updateData: bulkUpdateDto.updateData,
      scheduledFor: bulkUpdateDto.scheduledFor ? new Date(bulkUpdateDto.scheduledFor) : undefined,
      priority: 'normal',
    });
  }

  @Post('passes/bulk-share')
  @ApiOperation({ summary: 'Bulk share passes' })
  @ApiResponse({ status: 200, description: 'Bulk pass sharing initiated' })
  async bulkSharePasses(
    @Body() bulkShareDto: {
      passIds: string[];
      shareWithEmails: string[];
      shareMessage?: string;
      expiresAt?: string;
    }
  ) {
    return await this.passSharingService.bulkSharePasses(
      bulkShareDto.passIds,
      {
        shareWithEmails: bulkShareDto.shareWithEmails,
        shareMessage: bulkShareDto.shareMessage,
        expiresAt: bulkShareDto.expiresAt ? new Date(bulkShareDto.expiresAt) : undefined,
      }
    );
  }

  // Apple Wallet Web Service Endpoints

  @Post('apple/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @ApiOperation({ summary: 'Apple Wallet device registration' })
  async registerAppleDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string,
    @Body() body: any,
    @Res() res: Response
  ) {
    const result = await this.applePassKitService.handleWebServiceRequest(
      'POST',
      `v1/devices/${deviceLibraryIdentifier}/registrations/${passTypeIdentifier}/${serialNumber}`,
      { authorization },
      body
    );

    res.status(result.statusCode);
    if (result.headers) {
      res.set(result.headers);
    }
    if (result.data) {
      res.json(result.data);
    } else {
      res.end();
    }
  }

  @Get('apple/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier')
  @ApiOperation({ summary: 'Get updatable passes for device' })
  async getUpdatablePasses(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Headers('authorization') authorization: string,
    @Headers('if-modified-since') ifModifiedSince: string,
    @Res() res: Response
  ) {
    const result = await this.applePassKitService.handleWebServiceRequest(
      'GET',
      `v1/devices/${deviceLibraryIdentifier}/registrations/${passTypeIdentifier}`,
      { authorization, 'if-modified-since': ifModifiedSince }
    );

    res.status(result.statusCode);
    if (result.headers) {
      res.set(result.headers);
    }
    if (result.data) {
      res.json(result.data);
    } else {
      res.end();
    }
  }

  @Get('apple/v1/passes/:passTypeIdentifier/:serialNumber')
  @ApiOperation({ summary: 'Get latest version of pass' })
  async getLatestPass(
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string,
    @Headers('if-modified-since') ifModifiedSince: string,
    @Res() res: Response
  ) {
    const result = await this.applePassKitService.handleWebServiceRequest(
      'GET',
      `v1/passes/${passTypeIdentifier}/${serialNumber}`,
      { authorization, 'if-modified-since': ifModifiedSince }
    );

    res.status(result.statusCode);
    if (result.headers) {
      res.set(result.headers);
    }
    if (result.data) {
      res.send(result.data);
    } else {
      res.end();
    }
  }

  @Delete('apple/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @ApiOperation({ summary: 'Unregister device from pass updates' })
  async unregisterAppleDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string,
    @Res() res: Response
  ) {
    const result = await this.applePassKitService.handleWebServiceRequest(
      'DELETE',
      `v1/devices/${deviceLibraryIdentifier}/registrations/${passTypeIdentifier}/${serialNumber}`,
      { authorization }
    );

    res.status(result.statusCode).end();
  }

  @Post('apple/v1/log')
  @ApiOperation({ summary: 'Log messages from Apple Wallet' })
  async logAppleMessages(@Body() messages: any[], @Res() res: Response) {
    const result = await this.applePassKitService.handleWebServiceRequest(
      'POST_LOG',
      'v1/log',
      {},
      messages
    );

    res.status(result.statusCode).end();
  }

  // Health Check

  @Get('health')
  @ApiOperation({ summary: 'Health check for mobile wallet service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        applePassKit: 'operational',
        googlePay: 'operational',
        qrCode: 'operational',
        analytics: 'operational',
      },
    };
  }
}
