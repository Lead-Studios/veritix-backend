import { Controller, Post, Body, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { BadgeService } from './badge.service';
import { GenerateBadgeDto } from './dto/generate-badge.dto';
import * as fs from 'fs';

@Controller('badge')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Post('generate')
  async generateBadge(@Body() generateBadgeDto: GenerateBadgeDto) {
    const badgeUrl = await this.badgeService.generateBadge(generateBadgeDto.ticketId);
    return { badgeUrl };
  }

  @Get('download/:ticketId')
  async downloadBadge(@Param('ticketId') ticketId: string, @Res() res: Response) {
    const filePath = await this.badgeService.getBadgeFilePath(ticketId);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="badge-${ticketId}.pdf"`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}