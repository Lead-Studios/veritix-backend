import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FraudDetectionService } from './fraud-detection.service';
import { FraudRuleService } from './fraud-rule.service';
import { Order, FraudAlert, FraudReport } from './fraud-detection.types';

// Simple admin guard - replace with your actual auth implementation
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Replace with actual admin authentication logic
    return request.headers['x-admin-key'] === 'admin-secret-key';
  }
}

@Controller('fraud-detection')
export class FraudDetectionController {
  constructor(
    private fraudDetectionService: FraudDetectionService,
    private fraudRuleService: FraudRuleService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeOrder(@Body() order: Order): Promise<{ alerts: FraudAlert[] }> {
    const alerts = await this.fraudDetectionService.analyzeOrder(order);
    return { alerts };
  }

  @Get('alerts/unresolved')
  @UseGuards(AdminGuard)
  async getUnresolvedAlerts(): Promise<{ alerts: FraudAlert[] }> {
    const alerts = await this.fraudDetectionService.getUnresolvedAlerts();
    return { alerts };
  }

  @Patch('alerts/:alertId/resolve')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { adminNotes?: string },
  ): Promise<{ message: string }> {
    await this.fraudDetectionService.resolveAlert(alertId, body.adminNotes);
    return { message: 'Alert resolved successfully' };
  }

  @Get('report')
  @UseGuards(AdminGuard)
  async getFraudReport(@Query('days') days?: string): Promise<FraudReport> {
    const reportDays = days ? parseInt(days, 10) : 30;
    return this.fraudDetectionService.getFraudReport(reportDays);
  }

  @Get('rules')
  @UseGuards(AdminGuard)
  async getFraudRules() {
    return { rules: this.fraudRuleService.getRules() };
  }

  @Patch('rules/:ruleName')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async updateFraudRule(
    @Param('ruleName') ruleName: string,
    @Body() updates: { enabled?: boolean; severity?: FraudSeverity },
  ): Promise<{ message: string }> {
    this.fraudRuleService.updateRule(ruleName, updates);
    return { message: 'Rule updated successfully' };
  }
}
