import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HybridCheckIn } from '../entities/hybrid-checkin.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { CheckInType } from '../enums/virtual-event.enum';

export interface CheckInData {
  userId?: string;
  location?: string;
  deviceId?: string;
  ipAddress?: string;
  geolocation?: Record<string, any>;
  qrCodeData?: string;
  nfcData?: string;
  biometricData?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  verificationMethod?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class HybridCheckInService {
  private readonly logger = new Logger(HybridCheckInService.name);

  constructor(
    @InjectRepository(HybridCheckIn)
    private readonly checkInRepository: Repository<HybridCheckIn>,
    @InjectRepository(VirtualEvent)
    private readonly virtualEventRepository: Repository<VirtualEvent>,
    @InjectRepository(VirtualEventAttendee)
    private readonly attendeeRepository: Repository<VirtualEventAttendee>,
  ) {}

  async checkInPhysical(virtualEventId: string, checkInData: CheckInData): Promise<HybridCheckIn> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id: virtualEventId },
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    // Verify QR code or NFC data if provided
    if (checkInData.qrCodeData) {
      const isValidQR = await this.verifyQRCode(checkInData.qrCodeData, virtualEventId);
      if (!isValidQR) {
        throw new BadRequestException('Invalid QR code');
      }
    }

    // Check for existing physical check-in
    const existingCheckIn = await this.checkInRepository.findOne({
      where: {
        virtualEventId,
        userId: checkInData.userId,
        checkInType: CheckInType.PHYSICAL,
        checkOutTime: null,
      },
    });

    if (existingCheckIn) {
      throw new BadRequestException('User already checked in physically');
    }

    const checkIn = this.checkInRepository.create({
      virtualEventId,
      checkInType: CheckInType.PHYSICAL,
      checkInTime: new Date(),
      ...checkInData,
      isVerified: true,
    });

    const savedCheckIn = await this.checkInRepository.save(checkIn);
    this.logger.log(`Physical check-in for user ${checkInData.userId} at event ${virtualEventId}`);

    return savedCheckIn;
  }

  async checkInVirtual(virtualEventId: string, checkInData: CheckInData): Promise<HybridCheckIn> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id: virtualEventId },
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    // Check if user is already in virtual event
    const existingAttendee = await this.attendeeRepository.findOne({
      where: { virtualEventId, userId: checkInData.userId, leftAt: null },
    });

    if (!existingAttendee) {
      throw new BadRequestException('User is not currently in the virtual event');
    }

    const checkIn = this.checkInRepository.create({
      virtualEventId,
      checkInType: CheckInType.VIRTUAL,
      checkInTime: new Date(),
      ...checkInData,
      isVerified: true,
    });

    const savedCheckIn = await this.checkInRepository.save(checkIn);
    this.logger.log(`Virtual check-in for user ${checkInData.userId} at event ${virtualEventId}`);

    return savedCheckIn;
  }

  async checkInHybrid(virtualEventId: string, checkInData: CheckInData): Promise<HybridCheckIn> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id: virtualEventId },
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    // For hybrid check-in, user can be both physically present and virtually connected
    const checkIn = this.checkInRepository.create({
      virtualEventId,
      checkInType: CheckInType.HYBRID,
      checkInTime: new Date(),
      ...checkInData,
      isVerified: true,
    });

    const savedCheckIn = await this.checkInRepository.save(checkIn);
    this.logger.log(`Hybrid check-in for user ${checkInData.userId} at event ${virtualEventId}`);

    return savedCheckIn;
  }

  async checkOut(checkInId: string): Promise<HybridCheckIn> {
    const checkIn = await this.checkInRepository.findOne({
      where: { id: checkInId },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in record not found');
    }

    if (checkIn.checkOutTime) {
      throw new BadRequestException('User already checked out');
    }

    checkIn.checkOutTime = new Date();
    const updatedCheckIn = await this.checkInRepository.save(checkIn);

    this.logger.log(`Check-out for user ${checkIn.userId} from event ${checkIn.virtualEventId}`);
    return updatedCheckIn;
  }

  async getCheckIns(virtualEventId: string, checkInType?: CheckInType): Promise<HybridCheckIn[]> {
    const query = this.checkInRepository.createQueryBuilder('checkIn')
      .leftJoinAndSelect('checkIn.user', 'user')
      .where('checkIn.virtualEventId = :virtualEventId', { virtualEventId })
      .orderBy('checkIn.checkInTime', 'DESC');

    if (checkInType) {
      query.andWhere('checkIn.checkInType = :checkInType', { checkInType });
    }

    return query.getMany();
  }

  async getCurrentCheckIns(virtualEventId: string): Promise<HybridCheckIn[]> {
    return this.checkInRepository.find({
      where: { virtualEventId, checkOutTime: null },
      relations: ['user'],
      order: { checkInTime: 'DESC' },
    });
  }

  async getUserCheckInHistory(virtualEventId: string, userId: string): Promise<HybridCheckIn[]> {
    return this.checkInRepository.find({
      where: { virtualEventId, userId },
      order: { checkInTime: 'DESC' },
    });
  }

  async getCheckInAnalytics(virtualEventId: string): Promise<any> {
    const totalCheckIns = await this.checkInRepository.count({
      where: { virtualEventId },
    });

    const checkInsByType = await this.checkInRepository
      .createQueryBuilder('checkIn')
      .select('checkIn.checkInType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('checkIn.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('checkIn.checkInType')
      .getRawMany();

    const currentCheckIns = await this.checkInRepository.count({
      where: { virtualEventId, checkOutTime: null },
    });

    const checkInTimeline = await this.checkInRepository
      .createQueryBuilder('checkIn')
      .select('DATE_TRUNC(\'hour\', checkIn.checkInTime)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('checkIn.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('DATE_TRUNC(\'hour\', checkIn.checkInTime)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    const averageDuration = await this.checkInRepository
      .createQueryBuilder('checkIn')
      .select('AVG(EXTRACT(EPOCH FROM (checkIn.checkOutTime - checkIn.checkInTime)))', 'avgDuration')
      .where('checkIn.virtualEventId = :virtualEventId', { virtualEventId })
      .andWhere('checkIn.checkOutTime IS NOT NULL')
      .getRawOne();

    return {
      totalCheckIns,
      currentCheckIns,
      checkInsByType: checkInsByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      checkInTimeline: checkInTimeline.map(item => ({
        hour: item.hour,
        count: parseInt(item.count),
      })),
      averageDuration: parseInt(averageDuration?.avgDuration) || 0,
    };
  }

  async verifyAttendee(checkInId: string, verificationData: Record<string, any>): Promise<HybridCheckIn> {
    const checkIn = await this.checkInRepository.findOne({
      where: { id: checkInId },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in record not found');
    }

    checkIn.isVerified = true;
    checkIn.metadata = { ...checkIn.metadata, verification: verificationData };

    return this.checkInRepository.save(checkIn);
  }

  async generateQRCode(virtualEventId: string, userId: string): Promise<string> {
    // Generate a unique QR code for the user and event
    const qrData = {
      eventId: virtualEventId,
      userId,
      timestamp: Date.now(),
      signature: this.generateSignature(virtualEventId, userId),
    };

    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }

  private async verifyQRCode(qrCodeData: string, virtualEventId: string): Promise<boolean> {
    try {
      const decoded = JSON.parse(Buffer.from(qrCodeData, 'base64').toString());
      
      // Verify the QR code is for this event
      if (decoded.eventId !== virtualEventId) {
        return false;
      }

      // Verify the signature
      const expectedSignature = this.generateSignature(decoded.eventId, decoded.userId);
      if (decoded.signature !== expectedSignature) {
        return false;
      }

      // Check if QR code is not too old (e.g., 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - decoded.timestamp > maxAge) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to verify QR code', error);
      return false;
    }
  }

  private generateSignature(eventId: string, userId: string): string {
    // In production, use a proper cryptographic signature
    return Buffer.from(`${eventId}:${userId}:veritix-secret`).toString('base64');
  }
}
