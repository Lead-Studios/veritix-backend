import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualEventRecording } from '../entities/virtual-event-recording.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { RecordingStatus, AccessLevel } from '../enums/virtual-event.enum';
import { CreateRecordingDto } from '../dto/create-recording.dto';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(
    @InjectRepository(VirtualEventRecording)
    private readonly recordingRepository: Repository<VirtualEventRecording>,
    @InjectRepository(VirtualEvent)
    private readonly virtualEventRepository: Repository<VirtualEvent>,
  ) {}

  async startRecording(virtualEventId: string, recordingData: CreateRecordingDto): Promise<VirtualEventRecording> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id: virtualEventId },
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    if (!virtualEvent.allowRecording) {
      throw new BadRequestException('Recording is not enabled for this event');
    }

    // Check if already recording
    const existingRecording = await this.recordingRepository.findOne({
      where: { 
        virtualEventId, 
        status: RecordingStatus.RECORDING,
      },
    });

    if (existingRecording) {
      throw new BadRequestException('Event is already being recorded');
    }

    const recording = this.recordingRepository.create({
      ...recordingData,
      virtualEventId,
      status: RecordingStatus.RECORDING,
      recordingStartedAt: new Date(),
    });

    const savedRecording = await this.recordingRepository.save(recording);

    // Update virtual event recording status
    await this.virtualEventRepository.update(virtualEventId, {
      recordingStatus: RecordingStatus.RECORDING,
      recordingStartedAt: new Date(),
      isRecorded: true,
    });

    this.logger.log(`Started recording for virtual event: ${virtualEventId}`);
    return savedRecording;
  }

  async stopRecording(recordingId: string): Promise<VirtualEventRecording> {
    const recording = await this.recordingRepository.findOne({
      where: { id: recordingId },
      relations: ['virtualEvent'],
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    if (recording.status !== RecordingStatus.RECORDING) {
      throw new BadRequestException('Recording is not currently active');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - recording.recordingStartedAt.getTime()) / 1000);

    await this.recordingRepository.update(recordingId, {
      status: RecordingStatus.PROCESSING,
      recordingEndedAt: endTime,
      duration,
      processingStartedAt: new Date(),
    });

    // Update virtual event
    await this.virtualEventRepository.update(recording.virtualEventId, {
      recordingStatus: RecordingStatus.PROCESSING,
      recordingEndedAt: endTime,
    });

    this.logger.log(`Stopped recording: ${recordingId}`);
    
    // Simulate processing (in real implementation, this would be async)
    setTimeout(() => {
      this.completeProcessing(recordingId);
    }, 5000);

    return this.recordingRepository.findOne({ where: { id: recordingId } });
  }

  async completeProcessing(recordingId: string): Promise<VirtualEventRecording> {
    const recording = await this.recordingRepository.findOne({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const processingCompleted = new Date();
    
    await this.recordingRepository.update(recordingId, {
      status: RecordingStatus.AVAILABLE,
      processingCompletedAt: processingCompleted,
      recordingUrl: this.generateRecordingUrl(recordingId),
      downloadUrl: this.generateDownloadUrl(recordingId),
      thumbnailUrl: this.generateThumbnailUrl(recordingId),
    });

    // Update virtual event
    await this.virtualEventRepository.update(recording.virtualEventId, {
      recordingStatus: RecordingStatus.AVAILABLE,
      recordingUrl: this.generateRecordingUrl(recordingId),
    });

    this.logger.log(`Completed processing for recording: ${recordingId}`);
    return this.recordingRepository.findOne({ where: { id: recordingId } });
  }

  async getRecordings(virtualEventId: string): Promise<VirtualEventRecording[]> {
    return this.recordingRepository.find({
      where: { virtualEventId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecording(recordingId: string): Promise<VirtualEventRecording> {
    const recording = await this.recordingRepository.findOne({
      where: { id: recordingId },
      relations: ['virtualEvent'],
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  async updateRecordingAccess(
    recordingId: string,
    accessLevel: AccessLevel,
    availableUntil?: Date,
  ): Promise<VirtualEventRecording> {
    const recording = await this.getRecording(recordingId);

    await this.recordingRepository.update(recordingId, {
      accessLevel,
      availableUntil,
    });

    return this.getRecording(recordingId);
  }

  async generateTranscription(recordingId: string): Promise<VirtualEventRecording> {
    const recording = await this.getRecording(recordingId);

    if (recording.status !== RecordingStatus.AVAILABLE) {
      throw new BadRequestException('Recording is not available for transcription');
    }

    // Simulate transcription generation
    const transcription = {
      language: 'en',
      segments: [
        {
          start: 0,
          end: 10,
          text: 'Welcome to our virtual event...',
          speaker: 'Host',
        },
        // More segments would be generated by actual transcription service
      ],
      confidence: 0.95,
      generatedAt: new Date(),
    };

    await this.recordingRepository.update(recordingId, {
      transcription,
      hasTranscription: true,
    });

    this.logger.log(`Generated transcription for recording: ${recordingId}`);
    return this.getRecording(recordingId);
  }

  async addChapters(recordingId: string, chapters: any[]): Promise<VirtualEventRecording> {
    const recording = await this.getRecording(recordingId);

    await this.recordingRepository.update(recordingId, {
      chapters,
      hasChapters: true,
    });

    return this.getRecording(recordingId);
  }

  async incrementViewCount(recordingId: string): Promise<void> {
    await this.recordingRepository.increment({ id: recordingId }, 'viewCount', 1);
  }

  async incrementDownloadCount(recordingId: string): Promise<void> {
    await this.recordingRepository.increment({ id: recordingId }, 'downloadCount', 1);
  }

  async deleteRecording(recordingId: string): Promise<void> {
    const recording = await this.getRecording(recordingId);

    if (recording.status === RecordingStatus.RECORDING) {
      throw new BadRequestException('Cannot delete active recording');
    }

    await this.recordingRepository.softDelete(recordingId);
    this.logger.log(`Deleted recording: ${recordingId}`);
  }

  async getRecordingAnalytics(recordingId: string): Promise<any> {
    const recording = await this.getRecording(recordingId);

    return {
      recordingId: recording.id,
      title: recording.title,
      duration: recording.duration,
      viewCount: recording.viewCount,
      downloadCount: recording.downloadCount,
      status: recording.status,
      accessLevel: recording.accessLevel,
      fileSize: recording.fileSize,
      format: recording.format,
      quality: recording.quality,
      hasTranscription: recording.hasTranscription,
      hasChapters: recording.hasChapters,
      createdAt: recording.createdAt,
      availableUntil: recording.availableUntil,
    };
  }

  private generateRecordingUrl(recordingId: string): string {
    return `https://recordings.veritix.com/${recordingId}/stream`;
  }

  private generateDownloadUrl(recordingId: string): string {
    return `https://recordings.veritix.com/${recordingId}/download`;
  }

  private generateThumbnailUrl(recordingId: string): string {
    return `https://recordings.veritix.com/${recordingId}/thumbnail.jpg`;
  }
}
