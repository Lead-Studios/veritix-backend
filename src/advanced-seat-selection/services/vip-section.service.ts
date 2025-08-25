import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VipSection, VipSectionType, VipAccessLevel } from '../entities/vip-section.entity';
import { EnhancedSeat, EnhancedSeatType } from '../entities/enhanced-seat.entity';
import { VenueMap } from '../entities/venue-map.entity';

@Injectable()
export class VipSectionService {
  private readonly logger = new Logger(VipSectionService.name);

  constructor(
    @InjectRepository(VipSection)
    private readonly vipSectionRepository: Repository<VipSection>,
    @InjectRepository(EnhancedSeat)
    private readonly enhancedSeatRepository: Repository<EnhancedSeat>,
    @InjectRepository(VenueMap)
    private readonly venueMapRepository: Repository<VenueMap>,
  ) {}

  async createVipSection(vipSectionData: Partial<VipSection>): Promise<VipSection> {
    const venueMap = await this.venueMapRepository.findOne({
      where: { id: vipSectionData.venueMapId },
    });

    if (!venueMap) {
      throw new NotFoundException(`Venue map ${vipSectionData.venueMapId} not found`);
    }

    const vipSection = this.vipSectionRepository.create({
      ...vipSectionData,
      occupiedSeats: 0,
      isActive: true,
      isBookable: true,
    });

    const savedVipSection = await this.vipSectionRepository.save(vipSection);
    this.logger.log(`Created VIP section: ${savedVipSection.id}`);

    return savedVipSection;
  }

  async getVipSection(id: string): Promise<VipSection> {
    const vipSection = await this.vipSectionRepository.findOne({
      where: { id },
      relations: ['venueMap'],
    });

    if (!vipSection) {
      throw new NotFoundException(`VIP section ${id} not found`);
    }

    return vipSection;
  }

  async getVipSectionWithSeats(id: string): Promise<{
    vipSection: VipSection;
    seats: EnhancedSeat[];
    occupancyDetails: any;
  }> {
    const vipSection = await this.getVipSection(id);

    // Get seats within VIP section boundaries
    const seats = await this.getSeatsInVipSection(id);

    const occupancyDetails = {
      totalCapacity: vipSection.capacity,
      occupiedSeats: vipSection.occupiedSeats,
      availableSeats: vipSection.availableSeats,
      occupancyRate: vipSection.occupancyRate,
      seatsByStatus: this.groupSeatsByStatus(seats),
      seatsByType: this.groupSeatsByType(seats),
    };

    return {
      vipSection,
      seats,
      occupancyDetails,
    };
  }

  async updateVipSection(id: string, updateData: Partial<VipSection>): Promise<VipSection> {
    const vipSection = await this.getVipSection(id);
    
    Object.assign(vipSection, updateData);
    
    const updatedVipSection = await this.vipSectionRepository.save(vipSection);
    this.logger.log(`Updated VIP section: ${id}`);

    return updatedVipSection;
  }

  async getVipSectionsByVenue(venueMapId: string): Promise<VipSection[]> {
    return this.vipSectionRepository.find({
      where: { venueMapId, isActive: true },
      order: { priority: 'ASC', name: 'ASC' },
    });
  }

  async assignSeatsToVipSection(
    vipSectionId: string,
    seatIds: string[]
  ): Promise<{
    success: boolean;
    assignedSeats: number;
    message?: string;
  }> {
    try {
      const vipSection = await this.getVipSection(vipSectionId);

      const seats = await this.enhancedSeatRepository.find({
        where: { id: { $in: seatIds } as any },
      });

      if (seats.length === 0) {
        return { success: false, assignedSeats: 0, message: 'No valid seats found' };
      }

      // Check if seats are within VIP section boundaries
      const validSeats = seats.filter(seat => 
        this.isSeatWithinVipBoundaries(seat, vipSection)
      );

      if (validSeats.length === 0) {
        return { 
          success: false, 
          assignedSeats: 0, 
          message: 'No seats are within VIP section boundaries' 
        };
      }

      // Update seats to VIP type and higher pricing
      for (const seat of validSeats) {
        await this.enhancedSeatRepository.update(seat.id, {
          type: EnhancedSeatType.VIP,
          basePrice: Math.max(seat.basePrice, vipSection.basePrice),
          currentPrice: Math.max(seat.effectivePrice, vipSection.basePrice),
        });
      }

      // Update VIP section capacity if needed
      const newCapacity = Math.max(vipSection.capacity, validSeats.length);
      if (newCapacity !== vipSection.capacity) {
        await this.vipSectionRepository.update(vipSectionId, {
          capacity: newCapacity,
        });
      }

      this.logger.log(`Assigned ${validSeats.length} seats to VIP section ${vipSectionId}`);

      return {
        success: true,
        assignedSeats: validSeats.length,
      };
    } catch (error) {
      this.logger.error(`Error assigning seats to VIP section: ${error.message}`);
      return { 
        success: false, 
        assignedSeats: 0, 
        message: 'Failed to assign seats to VIP section' 
      };
    }
  }

  async removeSeatsFromVipSection(
    vipSectionId: string,
    seatIds: string[]
  ): Promise<{
    success: boolean;
    removedSeats: number;
    message?: string;
  }> {
    try {
      const vipSection = await this.getVipSection(vipSectionId);

      const seats = await this.enhancedSeatRepository.find({
        where: { 
          id: { $in: seatIds } as any,
          type: EnhancedSeatType.VIP,
        },
      });

      if (seats.length === 0) {
        return { success: false, removedSeats: 0, message: 'No VIP seats found' };
      }

      // Revert seats to standard type and pricing
      for (const seat of seats) {
        await this.enhancedSeatRepository.update(seat.id, {
          type: EnhancedSeatType.STANDARD,
          // Reset to original pricing tier if available
          currentPrice: seat.basePrice,
        });
      }

      this.logger.log(`Removed ${seats.length} seats from VIP section ${vipSectionId}`);

      return {
        success: true,
        removedSeats: seats.length,
      };
    } catch (error) {
      this.logger.error(`Error removing seats from VIP section: ${error.message}`);
      return { 
        success: false, 
        removedSeats: 0, 
        message: 'Failed to remove seats from VIP section' 
      };
    }
  }

  async bookVipSection(
    vipSectionId: string,
    bookingData: {
      sessionId: string;
      userId?: string;
      contactInfo: any;
      specialRequests?: string;
    }
  ): Promise<{
    success: boolean;
    message?: string;
    bookingReference?: string;
    totalPrice?: number;
  }> {
    try {
      const vipSection = await this.getVipSection(vipSectionId);

      if (!vipSection.hasAvailability) {
        return { success: false, message: 'VIP section is not available' };
      }

      if (vipSection.requiresApproval) {
        // Create pending booking that requires manual approval
        return {
          success: true,
          message: 'VIP section booking submitted for approval',
          bookingReference: `VIP-PENDING-${Date.now()}`,
        };
      }

      // For immediate bookings, calculate pricing
      const totalPrice = vipSection.packagePrice || 
        (vipSection.basePrice * vipSection.capacity);

      // Mark section as fully booked
      await this.vipSectionRepository.update(vipSectionId, {
        occupiedSeats: vipSection.capacity,
        isBookable: false,
      });

      const bookingReference = `VIP-${vipSectionId}-${Date.now()}`;

      this.logger.log(`VIP section ${vipSectionId} booked with reference ${bookingReference}`);

      return {
        success: true,
        bookingReference,
        totalPrice,
      };
    } catch (error) {
      this.logger.error(`Error booking VIP section: ${error.message}`);
      return { success: false, message: 'Failed to book VIP section' };
    }
  }

  async getVipSectionAvailability(venueMapId: string): Promise<{
    totalVipSections: number;
    availableSections: number;
    sectionsByType: Record<string, any>;
    sectionsByAccessLevel: Record<string, any>;
  }> {
    const vipSections = await this.vipSectionRepository.find({
      where: { venueMapId, isActive: true },
    });

    const availableSections = vipSections.filter(section => section.hasAvailability).length;

    const sectionsByType = vipSections.reduce((acc, section) => {
      if (!acc[section.vipType]) {
        acc[section.vipType] = { total: 0, available: 0, capacity: 0 };
      }
      acc[section.vipType].total++;
      acc[section.vipType].capacity += section.capacity;
      if (section.hasAvailability) {
        acc[section.vipType].available++;
      }
      return acc;
    }, {});

    const sectionsByAccessLevel = vipSections.reduce((acc, section) => {
      if (!acc[section.accessLevel]) {
        acc[section.accessLevel] = { total: 0, available: 0, capacity: 0 };
      }
      acc[section.accessLevel].total++;
      acc[section.accessLevel].capacity += section.capacity;
      if (section.hasAvailability) {
        acc[section.accessLevel].available++;
      }
      return acc;
    }, {});

    return {
      totalVipSections: vipSections.length,
      availableSections,
      sectionsByType,
      sectionsByAccessLevel,
    };
  }

  async updateVipSectionOccupancy(vipSectionId: string): Promise<void> {
    const vipSection = await this.getVipSection(vipSectionId);
    const seats = await this.getSeatsInVipSection(vipSectionId);

    const occupiedSeats = seats.filter(seat => 
      seat.status === 'sold' || seat.status === 'held' || seat.status === 'reserved'
    ).length;

    await this.vipSectionRepository.update(vipSectionId, {
      occupiedSeats,
      isBookable: occupiedSeats < vipSection.capacity,
    });

    this.logger.log(`Updated VIP section ${vipSectionId} occupancy: ${occupiedSeats}/${vipSection.capacity}`);
  }

  private async getSeatsInVipSection(vipSectionId: string): Promise<EnhancedSeat[]> {
    const vipSection = await this.getVipSection(vipSectionId);

    // This is a simplified implementation
    // In a real scenario, you'd use spatial queries to find seats within boundaries
    return this.enhancedSeatRepository.find({
      where: {
        venueMapId: vipSection.venueMapId,
        type: EnhancedSeatType.VIP,
        isActive: true,
      },
    });
  }

  private isSeatWithinVipBoundaries(seat: EnhancedSeat, vipSection: VipSection): boolean {
    const seatPos = seat.position;
    const boundaries = vipSection.boundaries;

    // Simple rectangular boundary check
    if (boundaries.shape === 'rectangle' || !boundaries.shape) {
      return (
        seatPos.x >= boundaries.x &&
        seatPos.x <= boundaries.x + boundaries.width &&
        seatPos.y >= boundaries.y &&
        seatPos.y <= boundaries.y + boundaries.height
      );
    }

    // For other shapes, implement appropriate geometric calculations
    return true; // Simplified for now
  }

  private groupSeatsByStatus(seats: EnhancedSeat[]): Record<string, number> {
    return seats.reduce((acc, seat) => {
      acc[seat.status] = (acc[seat.status] || 0) + 1;
      return acc;
    }, {});
  }

  private groupSeatsByType(seats: EnhancedSeat[]): Record<string, number> {
    return seats.reduce((acc, seat) => {
      acc[seat.type] = (acc[seat.type] || 0) + 1;
      return acc;
    }, {});
  }

  async getVipSectionStats(venueMapId?: string): Promise<any> {
    let query = this.vipSectionRepository
      .createQueryBuilder('vip')
      .select('vip.vipType', 'vipType')
      .addSelect('vip.accessLevel', 'accessLevel')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(vip.capacity)', 'totalCapacity')
      .addSelect('SUM(vip.occupiedSeats)', 'totalOccupied')
      .addSelect('AVG(vip.basePrice)', 'avgBasePrice')
      .addSelect('SUM(vip.packagePrice)', 'totalPackageValue');

    if (venueMapId) {
      query = query.where('vip.venueMapId = :venueMapId', { venueMapId });
    }

    const stats = await query
      .andWhere('vip.isActive = :isActive', { isActive: true })
      .groupBy('vip.vipType, vip.accessLevel')
      .getRawMany();

    const totalRevenue = await this.vipSectionRepository
      .createQueryBuilder('vip')
      .select('SUM(vip.packagePrice * (vip.occupiedSeats / vip.capacity))', 'revenue')
      .where('vip.isActive = :isActive', { isActive: true })
      .andWhere(venueMapId ? 'vip.venueMapId = :venueMapId' : '1=1', { venueMapId })
      .getRawOne();

    return {
      stats,
      totalRevenue: totalRevenue.revenue || 0,
      lastUpdated: new Date(),
    };
  }
}
