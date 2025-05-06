import { Controller, Get, Post, Body, Patch, Param, Delete, Res, ParseUUIDPipe } from "@nestjs/common"
import type { Response } from "express"
import type { BadgeService } from "./badge.service"
import type { CreateAttendeeDto } from "./dto/create-attendee.dto"
import type { UpdateAttendeeDto } from "./dto/update-attendee.dto"
import type { Attendee } from "./entities/attendee.entity"

@Controller("badges")
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Post('attendees')
  createAttendee(@Body() createAttendeeDto: CreateAttendeeDto): Promise<Attendee> {
    return this.badgeService.createAttendee(createAttendeeDto);
  }

  @Get("attendees")
  findAllAttendees(): Promise<Attendee[]> {
    return this.badgeService.findAllAttendees()
  }

  @Get('attendees/:id')
  findAttendeeById(@Param('id', ParseUUIDPipe) id: string): Promise<Attendee> {
    return this.badgeService.findAttendeeById(id);
  }

  @Get('conferences/:id/attendees')
  findAttendeesByConference(@Param('id', ParseUUIDPipe) id: string): Promise<Attendee[]> {
    return this.badgeService.findAttendeesByConference(id);
  }

  @Patch("attendees/:id")
  updateAttendee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendeeDto: UpdateAttendeeDto,
  ): Promise<Attendee> {
    return this.badgeService.updateAttendee(id, updateAttendeeDto)
  }

  @Delete('attendees/:id')
  removeAttendee(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.badgeService.removeAttendee(id);
  }

  @Get('attendees/:id/qr-code')
  async getQRCode(@Param('id', ParseUUIDPipe) id: string): Promise<{ qrCode: string }> {
    const qrCode = await this.badgeService.generateQRCode(id);
    return { qrCode };
  }

  @Get("attendees/:id/badge")
  async generateBadge(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const pdfBuffer = await this.badgeService.generateBadgePDF(id)

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="badge-${id}.pdf"`,
      "Content-Length": pdfBuffer.length,
    })

    res.end(pdfBuffer)
  }

  @Get("conferences/:id/badges")
  async generateBulkBadges(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const pdfBuffer = await this.badgeService.generateBulkBadgesPDF(id)

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conference-badges-${id}.pdf"`,
      "Content-Length": pdfBuffer.length,
    })

    res.end(pdfBuffer)
  }
}
