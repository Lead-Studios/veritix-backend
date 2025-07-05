import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WaitlistService } from './waitlist-entry.service';

@ApiTags('Waitlist')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Post(':id/waitlist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Join event waitlist' })
  @ApiResponse({ status: 201, description: 'Successfully joined waitlist' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - event has available tickets',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 409, description: 'User already on waitlist' })
  async joinWaitlist(@Param('id') eventId: string, @Req() req: Request) {
    const userId = req.user.id;
    const waitlistEntry = await this.waitlistService.joinWaitlist(
      userId,
      eventId,
    );

    return {
      success: true,
      message: 'Successfully joined waitlist',
      data: waitlistEntry,
    };
  }

  @Delete(':id/waitlist')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave event waitlist' })
  @ApiResponse({
    status: 204,
    description: 'Successfully removed from waitlist',
  })
  @ApiResponse({ status: 404, description: 'Waitlist entry not found' })
  async leaveWaitlist(@Param('id') eventId: string, @Req() req: Request) {
    const userId = req.user.id;
    await this.waitlistService.removeFromWaitlist(userId, eventId);
  }

  @Get(':id/waitlist/position')
  @ApiOperation({ summary: 'Get waitlist position' })
  @ApiResponse({ status: 200, description: 'Waitlist position retrieved' })
  @ApiResponse({ status: 404, description: 'User not found on waitlist' })
  async getWaitlistPosition(@Param('id') eventId: string, @Req() req: Request) {
    const userId = req.user.id;
    const position = await this.waitlistService.getWaitlistPosition(
      userId,
      eventId,
    );

    return {
      success: true,
      data: { position },
    };
  }

  @Get(':id/waitlist')
  @ApiOperation({ summary: 'Get event waitlist (admin only)' })
  @ApiResponse({ status: 200, description: 'Waitlist retrieved' })
  async getEventWaitlist(
    @Param('id') eventId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const waitlist = await this.waitlistService.getWaitlistByEvent(
      eventId,
      page,
      limit,
    );

    return {
      success: true,
      data: waitlist,
    };
  }
}
