import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, ParseIntPipe } from "@nestjs/common"
import type { AnalyticsService } from "./analytics.service"
import type { CreateAttendanceDto } from "./dto/create-attendance.dto"
import type { Attendance } from "./entities/attendance.entity"

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('attendance')
  recordAttendance(@Body() createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    return this.analyticsService.recordAttendance(createAttendanceDto);
  }

  @Get('conferences/:id/overview')
  getConferenceAttendancence(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.analyticsService.getConferenceAttendance(id);
  }

  @Get('sessions/:id/attendance')
  getSessionAttendance(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.analyticsService.getSessionAttendance(id);
  }

  @Get('conferences/:id/daily')
  getDailyAttendance(@Param('id', ParseUUIDPipe) id: string): Promise<any[]> {
    return this.analyticsService.getDailyAttendance(id);
  }

  @Get("conferences/:id/popular-sessions")
  getPopularSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<any[]> {
    return this.analyticsService.getPopularSessions(id, limit)
  }
}
