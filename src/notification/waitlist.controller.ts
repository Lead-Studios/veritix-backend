import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { WaitlistService } from "./waitlist.service";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto";

@Controller("events")
@UseGuards(JwtAuthGuard)
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post(":id/waitlist")
  async joinWaitlist(
    @Param("id") eventId: string,
    @Body() joinWaitlistDto: JoinWaitlistDto,
    @Request() req: any,
  ) {
    const userId = req.user.id; // Get from JWT token
    const entry = await this.waitlistService.joinWaitlist(userId, eventId);
    const position = await this.waitlistService.getWaitlistPosition(
      userId,
      eventId,
    );

    return {
      message: "Successfully joined waitlist",
      entry,
      position,
    };
  }

  @Delete(":id/waitlist")
  async leaveWaitlist(@Param("id") eventId: string, @Request() req: any) {
    const userId = req.user.id;
    await this.waitlistService.removeFromWaitlist(userId, eventId);

    return {
      message: "Successfully left waitlist",
    };
  }

  @Get(":id/waitlist/position")
  async getWaitlistPosition(@Param("id") eventId: string, @Request() req: any) {
    const userId = req.user.id;
    const position = await this.waitlistService.getWaitlistPosition(
      userId,
      eventId,
    );

    return {
      position: position === -1 ? null : position,
      message:
        position === -1
          ? "Not on waitlist"
          : `Position ${position} in waitlist`,
    };
  }

  @Get(":id/waitlist/count")
  async getWaitlistCount(@Param("id") eventId: string) {
    const count = await this.waitlistService.getEventWaitlistCount(eventId);

    return {
      count,
      message: `${count} users on waitlist`,
    };
  }
}
