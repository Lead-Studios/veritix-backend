import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from "@nestjs/common"
import type { ConferenceService } from "./conference.service"
import type { CreateConferenceDto } from "./dto/create-conference.dto"
import type { CreateSessionDto } from "./dto/create-session.dto"
import type { UpdateConferenceDto } from "./dto/update-conference.dto"
import type { UpdateSessionDto } from "./dto/update-session.dto"
import type { Conference } from "./entities/conference.entity"
import type { Session } from "./entities/session.entity"

@Controller("conferences")
export class ConferenceController {
  constructor(private readonly conferenceService: ConferenceService) {}

  @Post()
  createConference(@Body() createConferenceDto: CreateConferenceDto): Promise<Conference> {
    return this.conferenceService.createConference(createConferenceDto);
  }

  @Get()
  findAllConferences(): Promise<Conference[]> {
    return this.conferenceService.findAllConferences()
  }

  @Get(':id')
  findConferenceById(@Param('id', ParseUUIDPipe) id: string): Promise<Conference> {
    return this.conferenceService.findConferenceById(id);
  }

  @Patch(":id")
  updateConference(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateConferenceDto: UpdateConferenceDto,
  ): Promise<Conference> {
    return this.conferenceService.updateConference(id, updateConferenceDto)
  }

  @Delete(':id')
  removeConference(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.conferenceService.removeConference(id);
  }

  @Post('sessions')
  createSession(@Body() createSessionDto: CreateSessionDto): Promise<Session> {
    return this.conferenceService.createSession(createSessionDto);
  }

  @Get('sessions/:id')
  findSessionById(@Param('id', ParseUUIDPipe) id: string): Promise<Session> {
    return this.conferenceService.findSessionById(id);
  }

  @Patch("sessions/:id")
  updateSession(@Param('id', ParseUUIDPipe) id: string, @Body() updateSessionDto: UpdateSessionDto): Promise<Session> {
    return this.conferenceService.updateSession(id, updateSessionDto)
  }

  @Delete('sessions/:id')
  removeSession(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.conferenceService.removeSession(id);
  }

  @Get(":id/sessions/by-day")
  getSessionsByDay(@Param('id', ParseUUIDPipe) id: string, @Query('date') dateString: string): Promise<Session[]> {
    const date = new Date(dateString)
    return this.conferenceService.getSessionsByDay(id, date)
  }
}
