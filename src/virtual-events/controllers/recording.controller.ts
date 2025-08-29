import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecordingService } from '../services/recording.service';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccessLevel } from '../enums/virtual-event.enum';

@ApiTags('Virtual Event Recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('virtual-events/:eventId/recordings')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start recording a virtual event' })
  @ApiResponse({ status: 201, description: 'Recording started successfully' })
  async startRecording(@Param('eventId') eventId: string, @Body() recordingData: CreateRecordingDto) {
    return this.recordingService.startRecording(eventId, recordingData);
  }

  @Post(':recordingId/stop')
  @ApiOperation({ summary: 'Stop recording' })
  @ApiResponse({ status: 200, description: 'Recording stopped successfully' })
  async stopRecording(@Param('recordingId') recordingId: string) {
    return this.recordingService.stopRecording(recordingId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all recordings for an event' })
  @ApiResponse({ status: 200, description: 'Recordings retrieved successfully' })
  async getRecordings(@Param('eventId') eventId: string) {
    return this.recordingService.getRecordings(eventId);
  }

  @Get(':recordingId')
  @ApiOperation({ summary: 'Get a recording by ID' })
  @ApiResponse({ status: 200, description: 'Recording retrieved successfully' })
  async getRecording(@Param('recordingId') recordingId: string) {
    return this.recordingService.getRecording(recordingId);
  }

  @Patch(':recordingId/access')
  @ApiOperation({ summary: 'Update recording access settings' })
  @ApiResponse({ status: 200, description: 'Recording access updated successfully' })
  async updateRecordingAccess(
    @Param('recordingId') recordingId: string,
    @Body() accessData: { accessLevel: AccessLevel; availableUntil?: Date },
  ) {
    return this.recordingService.updateRecordingAccess(
      recordingId,
      accessData.accessLevel,
      accessData.availableUntil,
    );
  }

  @Post(':recordingId/transcription')
  @ApiOperation({ summary: 'Generate transcription for recording' })
  @ApiResponse({ status: 200, description: 'Transcription generated successfully' })
  async generateTranscription(@Param('recordingId') recordingId: string) {
    return this.recordingService.generateTranscription(recordingId);
  }

  @Post(':recordingId/chapters')
  @ApiOperation({ summary: 'Add chapters to recording' })
  @ApiResponse({ status: 200, description: 'Chapters added successfully' })
  async addChapters(@Param('recordingId') recordingId: string, @Body() chaptersData: { chapters: any[] }) {
    return this.recordingService.addChapters(recordingId, chaptersData.chapters);
  }

  @Post(':recordingId/view')
  @ApiOperation({ summary: 'Increment view count' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  async incrementViewCount(@Param('recordingId') recordingId: string) {
    return this.recordingService.incrementViewCount(recordingId);
  }

  @Post(':recordingId/download')
  @ApiOperation({ summary: 'Increment download count' })
  @ApiResponse({ status: 200, description: 'Download count incremented' })
  async incrementDownloadCount(@Param('recordingId') recordingId: string) {
    return this.recordingService.incrementDownloadCount(recordingId);
  }

  @Delete(':recordingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recording' })
  @ApiResponse({ status: 204, description: 'Recording deleted successfully' })
  async deleteRecording(@Param('recordingId') recordingId: string) {
    return this.recordingService.deleteRecording(recordingId);
  }

  @Get(':recordingId/analytics')
  @ApiOperation({ summary: 'Get recording analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Param('recordingId') recordingId: string) {
    return this.recordingService.getRecordingAnalytics(recordingId);
  }
}
