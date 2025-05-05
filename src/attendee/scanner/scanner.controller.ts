import { Controller, Post, Body } from '@nestjs/common';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('check-in')
  async checkIn(@Body() scanData: { qrCode: string }) {
    return this.scannerService.processCheckIn(scanData.qrCode);
  }

  @Post('session-check-in')
  async sessionCheckIn(@Body() scanData: { qrCode: string, sessionId: string }) {
    return this.scannerService.processSessionCheckIn(scanData.qrCode, scanData.sessionId);
  }
}