import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenueMap, VenueMapStatus } from '../entities/venue-map.entity';
import { EnhancedSeat } from '../entities/enhanced-seat.entity';
import { SeatPricingTier } from '../entities/seat-pricing-tier.entity';
import { VipSection } from '../entities/vip-section.entity';
import { AccessibilityFeature } from '../entities/accessibility-feature.entity';

@Injectable()
export class VenueMapService {
  private readonly logger = new Logger(VenueMapService.name);

  constructor(
    @InjectRepository(VenueMap)
    private readonly venueMapRepository: Repository<VenueMap>,
    @InjectRepository(EnhancedSeat)
    private readonly enhancedSeatRepository: Repository<EnhancedSeat>,
    @InjectRepository(SeatPricingTier)
    private readonly seatPricingTierRepository: Repository<SeatPricingTier>,
    @InjectRepository(VipSection)
    private readonly vipSectionRepository: Repository<VipSection>,
    @InjectRepository(AccessibilityFeature)
    private readonly accessibilityFeatureRepository: Repository<AccessibilityFeature>,
  ) {}

  async createVenueMap(venueMapData: Partial<VenueMap>): Promise<VenueMap> {
    try {
      const venueMap = this.venueMapRepository.create({
        ...venueMapData,
        status: VenueMapStatus.DRAFT,
        totalSeats: 0,
        availableSeats: 0,
        soldSeats: 0,
        heldSeats: 0,
      });

      const savedVenueMap = await this.venueMapRepository.save(venueMap);
      this.logger.log(`Created venue map: ${savedVenueMap.id}`);
      
      return savedVenueMap;
    } catch (error) {
      this.logger.error(`Error creating venue map: ${error.message}`);
      throw new BadRequestException('Failed to create venue map');
    }
  }

  async getVenueMap(id: string): Promise<VenueMap> {
    const venueMap = await this.venueMapRepository.findOne({
      where: { id },
      relations: ['seats', 'vipSections', 'accessibilityFeatures'],
    });

    if (!venueMap) {
      throw new NotFoundException(`Venue map ${id} not found`);
    }

    return venueMap;
  }

  async getVenueMapWithSVG(id: string): Promise<{
    venueMap: VenueMap;
    enhancedSvg: string;
    seatData: any[];
  }> {
    const venueMap = await this.getVenueMap(id);
    
    // Get all seats with their current status and pricing
    const seats = await this.enhancedSeatRepository.find({
      where: { venueMapId: id },
      relations: ['pricingTier'],
    });

    // Get VIP sections
    const vipSections = await this.vipSectionRepository.find({
      where: { venueMapId: id, isActive: true },
    });

    // Enhance SVG with real-time data
    const enhancedSvg = this.enhanceSvgWithRealTimeData(
      venueMap.svgData,
      seats,
      vipSections,
      venueMap.styling
    );

    const seatData = seats.map(seat => ({
      id: seat.id,
      sectionId: seat.sectionId,
      sectionName: seat.sectionName,
      row: seat.row,
      number: seat.number,
      label: seat.displayLabel,
      status: seat.status,
      type: seat.type,
      accessibilityType: seat.accessibilityType,
      basePrice: seat.basePrice,
      currentPrice: seat.effectivePrice,
      position: seat.position,
      features: seat.features,
      isSelectable: seat.isSelectable && seat.isAvailable,
      popularityScore: seat.popularityScore,
      pricingTier: seat.pricingTier ? {
        id: seat.pricingTier.id,
        name: seat.pricingTier.name,
        tierType: seat.pricingTier.tierType,
        colorCode: seat.pricingTier.colorCode,
        benefits: seat.pricingTier.benefits,
      } : null,
    }));

    return {
      venueMap,
      enhancedSvg,
      seatData,
    };
  }

  async updateVenueMap(id: string, updateData: Partial<VenueMap>): Promise<VenueMap> {
    const venueMap = await this.getVenueMap(id);
    
    Object.assign(venueMap, updateData);
    
    const updatedVenueMap = await this.venueMapRepository.save(venueMap);
    this.logger.log(`Updated venue map: ${id}`);
    
    return updatedVenueMap;
  }

  async publishVenueMap(id: string): Promise<VenueMap> {
    const venueMap = await this.getVenueMap(id);
    
    if (venueMap.status !== VenueMapStatus.DRAFT) {
      throw new BadRequestException('Only draft venue maps can be published');
    }

    // Validate venue map before publishing
    await this.validateVenueMapForPublishing(venueMap);

    venueMap.status = VenueMapStatus.ACTIVE;
    venueMap.publishedAt = new Date();
    
    const publishedVenueMap = await this.venueMapRepository.save(venueMap);
    this.logger.log(`Published venue map: ${id}`);
    
    return publishedVenueMap;
  }

  async archiveVenueMap(id: string): Promise<VenueMap> {
    const venueMap = await this.getVenueMap(id);
    
    venueMap.status = VenueMapStatus.ARCHIVED;
    venueMap.isActive = false;
    
    const archivedVenueMap = await this.venueMapRepository.save(venueMap);
    this.logger.log(`Archived venue map: ${id}`);
    
    return archivedVenueMap;
  }

  async getVenueMapsByEvent(eventId: string): Promise<VenueMap[]> {
    return this.venueMapRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  async cloneVenueMap(id: string, newEventId: string, newName: string): Promise<VenueMap> {
    const originalVenueMap = await this.getVenueMap(id);
    
    // Create new venue map
    const clonedVenueMap = this.venueMapRepository.create({
      ...originalVenueMap,
      id: undefined,
      eventId: newEventId,
      name: newName,
      status: VenueMapStatus.DRAFT,
      publishedAt: null,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const savedClonedVenueMap = await this.venueMapRepository.save(clonedVenueMap);

    // Clone seats
    const originalSeats = await this.enhancedSeatRepository.find({
      where: { venueMapId: id },
      relations: ['pricingTier'],
    });

    for (const originalSeat of originalSeats) {
      const clonedSeat = this.enhancedSeatRepository.create({
        ...originalSeat,
        id: undefined,
        venueMapId: savedClonedVenueMap.id,
        status: 'available',
        heldUntil: null,
        holdReference: null,
        selectionCount: 0,
        popularityScore: 1.0,
        createdAt: undefined,
        updatedAt: undefined,
      });

      await this.enhancedSeatRepository.save(clonedSeat);
    }

    // Clone VIP sections
    const originalVipSections = await this.vipSectionRepository.find({
      where: { venueMapId: id },
    });

    for (const originalVipSection of originalVipSections) {
      const clonedVipSection = this.vipSectionRepository.create({
        ...originalVipSection,
        id: undefined,
        venueMapId: savedClonedVenueMap.id,
        occupiedSeats: 0,
        createdAt: undefined,
        updatedAt: undefined,
      });

      await this.vipSectionRepository.save(clonedVipSection);
    }

    // Clone accessibility features
    const originalAccessibilityFeatures = await this.accessibilityFeatureRepository.find({
      where: { venueMapId: id },
    });

    for (const originalFeature of originalAccessibilityFeatures) {
      const clonedFeature = this.accessibilityFeatureRepository.create({
        ...originalFeature,
        id: undefined,
        venueMapId: savedClonedVenueMap.id,
        currentUsage: 0,
        createdAt: undefined,
        updatedAt: undefined,
      });

      await this.accessibilityFeatureRepository.save(clonedFeature);
    }

    this.logger.log(`Cloned venue map ${id} to ${savedClonedVenueMap.id}`);
    return savedClonedVenueMap;
  }

  async updateSeatCounts(venueMapId: string): Promise<void> {
    const counts = await this.enhancedSeatRepository
      .createQueryBuilder('seat')
      .select('seat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('seat.venueMapId = :venueMapId', { venueMapId })
      .andWhere('seat.isActive = :isActive', { isActive: true })
      .groupBy('seat.status')
      .getRawMany();

    const statusCounts = counts.reduce((acc, { status, count }) => {
      acc[status] = parseInt(count);
      return acc;
    }, {});

    const totalSeats = Object.values(statusCounts).reduce((sum: number, count: number) => sum + count, 0);
    const availableSeats = statusCounts['available'] || 0;
    const soldSeats = statusCounts['sold'] || 0;
    const heldSeats = (statusCounts['held'] || 0) + (statusCounts['reserved'] || 0);

    // Get accessibility and VIP counts
    const wheelchairSeats = await this.enhancedSeatRepository.count({
      where: { venueMapId, accessibilityType: 'wheelchair', isActive: true },
    });

    const vipSeats = await this.enhancedSeatRepository.count({
      where: { venueMapId, type: 'vip', isActive: true },
    });

    // Get price range
    const priceRange = await this.enhancedSeatRepository
      .createQueryBuilder('seat')
      .select('MIN(seat.basePrice)', 'minPrice')
      .addSelect('MAX(seat.basePrice)', 'maxPrice')
      .where('seat.venueMapId = :venueMapId', { venueMapId })
      .andWhere('seat.isActive = :isActive', { isActive: true })
      .getRawOne();

    await this.venueMapRepository.update(venueMapId, {
      totalSeats,
      availableSeats,
      soldSeats,
      heldSeats,
      wheelchairAccessibleSeats: wheelchairSeats,
      vipSeats,
      minPrice: priceRange.minPrice || 0,
      maxPrice: priceRange.maxPrice || 0,
    });

    this.logger.log(`Updated seat counts for venue map: ${venueMapId}`);
  }

  private enhanceSvgWithRealTimeData(
    originalSvg: string,
    seats: EnhancedSeat[],
    vipSections: VipSection[],
    styling: any
  ): string {
    let enhancedSvg = originalSvg;

    // Add seat status styling
    const seatColors = styling?.seatColors || {
      available: '#10B981',
      selected: '#3B82F6',
      sold: '#EF4444',
      held: '#F59E0B',
      blocked: '#6B7280',
      wheelchair: '#8B5CF6',
      vip: '#F59E0B',
    };

    // Apply seat colors based on current status
    for (const seat of seats) {
      const seatElement = `seat-${seat.id}`;
      const color = seatColors[seat.status] || seatColors.available;
      
      // Add or update seat styling in SVG
      enhancedSvg = enhancedSvg.replace(
        new RegExp(`id="${seatElement}"[^>]*`, 'g'),
        `$& fill="${color}" stroke="#000" stroke-width="1"`
      );
    }

    // Add VIP section highlighting
    for (const vipSection of vipSections) {
      const sectionElement = `vip-section-${vipSection.id}`;
      enhancedSvg = enhancedSvg.replace(
        new RegExp(`id="${sectionElement}"[^>]*`, 'g'),
        `$& fill="${vipSection.colorCode}" opacity="0.3"`
      );
    }

    return enhancedSvg;
  }

  private async validateVenueMapForPublishing(venueMap: VenueMap): Promise<void> {
    // Check if venue map has seats
    const seatCount = await this.enhancedSeatRepository.count({
      where: { venueMapId: venueMap.id, isActive: true },
    });

    if (seatCount === 0) {
      throw new BadRequestException('Venue map must have at least one seat to be published');
    }

    // Check if SVG data is valid
    if (!venueMap.svgData || venueMap.svgData.trim().length === 0) {
      throw new BadRequestException('Venue map must have valid SVG data');
    }

    // Check if map configuration is valid
    if (!venueMap.mapConfiguration || !venueMap.mapConfiguration.width || !venueMap.mapConfiguration.height) {
      throw new BadRequestException('Venue map must have valid configuration');
    }

    this.logger.log(`Venue map ${venueMap.id} validation passed`);
  }

  async getVenueMapStats(id: string): Promise<any> {
    const venueMap = await this.getVenueMap(id);
    
    const seatStats = await this.enhancedSeatRepository
      .createQueryBuilder('seat')
      .select('seat.status', 'status')
      .addSelect('seat.type', 'type')
      .addSelect('seat.accessibilityType', 'accessibilityType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(seat.basePrice)', 'avgPrice')
      .where('seat.venueMapId = :venueMapId', { venueMapId: id })
      .andWhere('seat.isActive = :isActive', { isActive: true })
      .groupBy('seat.status, seat.type, seat.accessibilityType')
      .getRawMany();

    const vipSectionStats = await this.vipSectionRepository
      .createQueryBuilder('vip')
      .select('vip.vipType', 'vipType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(vip.capacity)', 'totalCapacity')
      .addSelect('SUM(vip.occupiedSeats)', 'totalOccupied')
      .where('vip.venueMapId = :venueMapId', { venueMapId: id })
      .andWhere('vip.isActive = :isActive', { isActive: true })
      .groupBy('vip.vipType')
      .getRawMany();

    return {
      venueMap: {
        id: venueMap.id,
        name: venueMap.name,
        status: venueMap.status,
        totalSeats: venueMap.totalSeats,
        occupancyRate: venueMap.occupancyRate,
        availabilityRate: venueMap.availabilityRate,
      },
      seatStats,
      vipSectionStats,
      lastUpdated: new Date(),
    };
  }
}
