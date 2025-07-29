import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ConferenceService } from '../services/conference.service';
import { SessionFeedbackDto } from '../dtos/session-feedback.dto';
import { IssueCertificateDto } from '../dtos/issue-certificate.dto';

@Controller('conferences')
export class ConferenceController {
  constructor(private readonly conferenceService: ConferenceService) {}

  @Post()
  createConference(@Body() data: any) {
    return this.conferenceService.createConference(data);
  }

  @Get()
  getAllConferences() {
    return this.conferenceService.findAllConferences();
  }

  @Get(':id')
  getConference(@Param('id') id: number) {
    return this.conferenceService.findConferenceById(id);
  }

  @Patch(':id')
  updateConference(@Param('id') id: number, @Body() data: any) {
    return this.conferenceService.updateConference(id, data);
  }

  @Post(':id/sessions')
  createSession(@Param('id') conferenceId: number, @Body() data: any) {
    return this.conferenceService.createSession({
      ...data,
      conference: { id: conferenceId },
    });
  }

  @Patch('sessions/:id')
  updateSession(@Param('id') sessionId: number, @Body() data: any) {
    return this.conferenceService.updateSession(sessionId, data);
  }

  @Post('sessions/:id/speakers')
  assignSpeakers(
    @Param('id') sessionId: number,
    @Body('speakerIds') speakerIds: number[],
  ) {
    return this.conferenceService.assignSpeakersToSession(
      sessionId,
      speakerIds,
    );
  }

  @Post('speakers')
  createSpeaker(@Body() data: any) {
    return this.conferenceService.createSpeaker(data);
  }

  @Post('tracks')
  createTrack(@Body() data: any) {
    return this.conferenceService.createTrack(data);
  }

  @Post('sessions/:id/select')
  selectSession(
    @Param('id') sessionId: number,
    @Body('attendeeId') attendeeId: string,
  ) {
    return this.conferenceService.selectSession(attendeeId, sessionId);
  }

  @Get('my-agenda/:attendeeId')
  getMyAgenda(@Param('attendeeId') attendeeId: string) {
    return this.conferenceService.getMyAgenda(attendeeId);
  }

  @Post('sessions/:id/feedback')
  submitSessionFeedback(
    @Param('id') sessionId: number,
    @Body() dto: SessionFeedbackDto & { attendeeId: string },
  ) {
    return this.conferenceService.submitSessionFeedback(dto.attendeeId, {
      sessionId,
      rating: dto.rating,
      comment: dto.comment,
    });
  }

  @Post('certificates/issue')
  issueCertificate(@Body() dto: IssueCertificateDto) {
    return this.conferenceService.issueCertificate(
      dto.conferenceId,
      dto.attendeeId,
      dto.fileUrl,
    );
  }

  @Get(':id/analytics')
  getConferenceAnalytics(@Param('id') id: number) {
    return this.conferenceService.getConferenceAnalytics(id);
  }
}
