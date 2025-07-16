import { Controller, Get, Param, Res } from "@nestjs/common";
import { BadgeService } from "./badge.service";
import { Attendee } from "src/conference/entities/attendee.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "express";

@Controller('badges')
export class BadgeController {
  constructor(
    private badgeService: BadgeService,

    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>

  ) {}

  @Get(':id/pdf')
  async getBadgePdf(@Param('id') id: string, @Res() res: Response) {
    const attendee = await this.attendeeRepo.findOne({ where: { id } });
    if (!attendee) {
      res.status(404).json({ message: 'Attendee not found' });
      return;
    }
    const buffer = await this.badgeService.generateBadge(attendee);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="badge-${attendee.id}.pdf"`,
    });
    res.send(buffer);
  }
}