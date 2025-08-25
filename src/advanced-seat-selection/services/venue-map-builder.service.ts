import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenueMap, VenueMapStatus, VenueType } from '../entities/venue-map.entity';
import { EnhancedSeat, EnhancedSeatType, EnhancedSeatStatus, AccessibilityType } from '../entities/enhanced-seat.entity';
import { SeatPricingTier, PricingTierType } from '../entities/seat-pricing-tier.entity';
import { VipSection, VipSectionType, VipAccessLevel } from '../entities/vip-section.entity';
import { AccessibilityFeature, AccessibilityFeatureType } from '../entities/accessibility-feature.entity';

interface SeatTemplate {
  id: string;
  sectionId: string;
  sectionName: string;
  row: string;
  number: string;
  type: EnhancedSeatType;
  accessibilityType: AccessibilityType;
  position: { x: number; y: number; width: number; height: number };
  basePrice: number;
  pricingTierId?: string;
}

interface SectionTemplate {
  id: string;
  name: string;
  capacity: number;
  basePrice: number;
  seatLayout: {
    rows: number;
    seatsPerRow: number;
    startingRow: string;
    numbering: 'sequential' | 'odd-even' | 'custom';
  };
  position: { x: number; y: number; width: number; height: number };
}

@Injectable()
export class VenueMapBuilderService {
  private readonly logger = new Logger(VenueMapBuilderService.name);

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

  async createVenueFromTemplate(
    eventId: string,
    templateData: {
      name: string;
      venueType: VenueType;
      dimensions: { width: number; height: number };
      sections: SectionTemplate[];
      vipSections?: any[];
      accessibilityFeatures?: any[];
      styling?: any;
    }
  ): Promise<VenueMap> {
    try {
      // Create venue map
      const venueMap = await this.createBaseVenueMap(eventId, templateData);

      // Create pricing tiers
      const pricingTiers = await this.createDefaultPricingTiers(venueMap.id);

      // Create sections and seats
      for (const sectionTemplate of templateData.sections) {
        await this.createSectionFromTemplate(venueMap.id, sectionTemplate, pricingTiers);
      }

      // Create VIP sections if specified
      if (templateData.vipSections?.length) {
        for (const vipTemplate of templateData.vipSections) {
          await this.createVipSectionFromTemplate(venueMap.id, vipTemplate);
        }
      }

      // Create accessibility features if specified
      if (templateData.accessibilityFeatures?.length) {
        for (const accessibilityTemplate of templateData.accessibilityFeatures) {
          await this.createAccessibilityFeatureFromTemplate(venueMap.id, accessibilityTemplate);
        }
      }

      // Generate SVG representation
      const svgData = await this.generateVenueSVG(venueMap.id);
      
      // Update venue map with SVG and final counts
      await this.finalizeVenueMap(venueMap.id, svgData);

      this.logger.log(`Created venue map from template: ${venueMap.id}`);
      return venueMap;
    } catch (error) {
      this.logger.error(`Error creating venue from template: ${error.message}`);
      throw new BadRequestException('Failed to create venue from template');
    }
  }

  async addSectionToVenue(
    venueMapId: string,
    sectionData: {
      name: string;
      rows: number;
      seatsPerRow: number;
      startPosition: { x: number; y: number };
      basePrice: number;
      seatSpacing?: { x: number; y: number };
      rowSpacing?: number;
    }
  ): Promise<{ sectionId: string; seatsCreated: number }> {
    const venueMap = await this.venueMapRepository.findOne({
      where: { id: venueMapId },
    });

    if (!venueMap) {
      throw new BadRequestException('Venue map not found');
    }

    if (venueMap.status !== VenueMapStatus.DRAFT) {
      throw new BadRequestException('Can only modify draft venue maps');
    }

    const sectionId = `section-${Date.now()}`;
    const seatSpacing = sectionData.seatSpacing || { x: 40, y: 40 };
    const rowSpacing = sectionData.rowSpacing || 50;

    let seatsCreated = 0;
    const seats: EnhancedSeat[] = [];

    // Create seats for the section
    for (let row = 0; row < sectionData.rows; row++) {
      const rowLabel = String.fromCharCode(65 + row); // A, B, C, etc.
      
      for (let seatNum = 1; seatNum <= sectionData.seatsPerRow; seatNum++) {
        const seatPosition = {
          x: sectionData.startPosition.x + (seatNum - 1) * seatSpacing.x,
          y: sectionData.startPosition.y + row * rowSpacing,
          width: 30,
          height: 30,
        };

        const seat = this.enhancedSeatRepository.create({
          venueMapId,
          sectionId,
          sectionName: sectionData.name,
          row: rowLabel,
          number: seatNum.toString(),
          label: `${sectionData.name} ${rowLabel}-${seatNum}`,
          status: EnhancedSeatStatus.AVAILABLE,
          type: EnhancedSeatType.STANDARD,
          accessibilityType: AccessibilityType.NONE,
          basePrice: sectionData.basePrice,
          currentPrice: sectionData.basePrice,
          position: seatPosition,
          isActive: true,
          isSelectable: true,
          popularityScore: 1.0,
          selectionCount: 0,
        });

        seats.push(seat);
        seatsCreated++;
      }
    }

    await this.enhancedSeatRepository.save(seats);

    // Update venue map seat counts
    await this.updateVenueMapCounts(venueMapId);

    this.logger.log(`Added section ${sectionId} with ${seatsCreated} seats to venue ${venueMapId}`);

    return { sectionId, seatsCreated };
  }

  async moveSeat(
    seatId: string,
    newPosition: { x: number; y: number }
  ): Promise<void> {
    const seat = await this.enhancedSeatRepository.findOne({
      where: { id: seatId },
      relations: ['venueMap'],
    });

    if (!seat) {
      throw new BadRequestException('Seat not found');
    }

    if (seat.venueMap.status !== VenueMapStatus.DRAFT) {
      throw new BadRequestException('Can only modify seats in draft venue maps');
    }

    await this.enhancedSeatRepository.update(seatId, {
      position: {
        ...seat.position,
        x: newPosition.x,
        y: newPosition.y,
      },
    });

    this.logger.log(`Moved seat ${seatId} to position (${newPosition.x}, ${newPosition.y})`);
  }

  async deleteSeat(seatId: string): Promise<void> {
    const seat = await this.enhancedSeatRepository.findOne({
      where: { id: seatId },
      relations: ['venueMap'],
    });

    if (!seat) {
      throw new BadRequestException('Seat not found');
    }

    if (seat.venueMap.status !== VenueMapStatus.DRAFT) {
      throw new BadRequestException('Can only delete seats in draft venue maps');
    }

    await this.enhancedSeatRepository.remove(seat);
    await this.updateVenueMapCounts(seat.venueMapId);

    this.logger.log(`Deleted seat ${seatId}`);
  }

  async bulkUpdateSeats(
    venueMapId: string,
    updates: Array<{
      seatId: string;
      position?: { x: number; y: number };
      type?: EnhancedSeatType;
      accessibilityType?: AccessibilityType;
      basePrice?: number;
    }>
  ): Promise<{ updated: number; failed: number }> {
    const venueMap = await this.venueMapRepository.findOne({
      where: { id: venueMapId },
    });

    if (!venueMap || venueMap.status !== VenueMapStatus.DRAFT) {
      throw new BadRequestException('Can only modify draft venue maps');
    }

    let updated = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        const updateData: any = {};

        if (update.position) {
          const seat = await this.enhancedSeatRepository.findOne({
            where: { id: update.seatId },
          });
          if (seat) {
            updateData.position = {
              ...seat.position,
              x: update.position.x,
              y: update.position.y,
            };
          }
        }

        if (update.type) updateData.type = update.type;
        if (update.accessibilityType) updateData.accessibilityType = update.accessibilityType;
        if (update.basePrice) {
          updateData.basePrice = update.basePrice;
          updateData.currentPrice = update.basePrice;
        }

        await this.enhancedSeatRepository.update(update.seatId, updateData);
        updated++;
      } catch (error) {
        this.logger.warn(`Failed to update seat ${update.seatId}: ${error.message}`);
        failed++;
      }
    }

    if (updated > 0) {
      await this.updateVenueMapCounts(venueMapId);
    }

    this.logger.log(`Bulk update completed: ${updated} updated, ${failed} failed`);
    return { updated, failed };
  }

  async generateVenuePreview(venueMapId: string): Promise<{
    svgPreview: string;
    stats: any;
  }> {
    const svgPreview = await this.generateVenueSVG(venueMapId);
    const stats = await this.getVenueStats(venueMapId);

    return { svgPreview, stats };
  }

  private async createBaseVenueMap(
    eventId: string,
    templateData: any
  ): Promise<VenueMap> {
    const venueMap = this.venueMapRepository.create({
      name: templateData.name,
      eventId,
      venueType: templateData.venueType,
      status: VenueMapStatus.DRAFT,
      svgData: '', // Will be generated later
      mapConfiguration: {
        width: templateData.dimensions.width,
        height: templateData.dimensions.height,
        viewBox: `0 0 ${templateData.dimensions.width} ${templateData.dimensions.height}`,
        scale: 1,
        centerPoint: {
          x: templateData.dimensions.width / 2,
          y: templateData.dimensions.height / 2,
        },
        gridSize: 20,
        snapToGrid: true,
      },
      styling: templateData.styling || this.getDefaultStyling(),
      interactionSettings: {
        allowSeatSelection: true,
        allowMultiSelect: true,
        maxSeatsPerSelection: 10,
        showPricing: true,
        showSeatLabels: true,
        enableZoom: true,
        enablePan: true,
        mobileOptimized: true,
      },
      isActive: true,
    });

    return this.venueMapRepository.save(venueMap);
  }

  private async createDefaultPricingTiers(venueMapId: string): Promise<SeatPricingTier[]> {
    const tiers = [
      {
        name: 'Standard',
        tierType: PricingTierType.STANDARD,
        basePrice: 50,
        colorCode: '#3B82F6',
      },
      {
        name: 'Premium',
        tierType: PricingTierType.PREMIUM,
        basePrice: 75,
        colorCode: '#8B5CF6',
      },
      {
        name: 'VIP',
        tierType: PricingTierType.VIP,
        basePrice: 100,
        colorCode: '#F59E0B',
      },
    ];

    const createdTiers = [];
    for (const tierData of tiers) {
      const tier = this.seatPricingTierRepository.create({
        venueMapId,
        ...tierData,
        priceMultiplier: 1.0,
        priority: 1,
        isActive: true,
        isVisible: true,
      });
      createdTiers.push(await this.seatPricingTierRepository.save(tier));
    }

    return createdTiers;
  }

  private async createSectionFromTemplate(
    venueMapId: string,
    sectionTemplate: SectionTemplate,
    pricingTiers: SeatPricingTier[]
  ): Promise<void> {
    const standardTier = pricingTiers.find(t => t.tierType === PricingTierType.STANDARD);
    const seatSpacing = { x: 35, y: 35 };
    const rowSpacing = 45;

    const seats: EnhancedSeat[] = [];

    for (let row = 0; row < sectionTemplate.seatLayout.rows; row++) {
      const rowLabel = String.fromCharCode(65 + row);
      
      for (let seatNum = 1; seatNum <= sectionTemplate.seatLayout.seatsPerRow; seatNum++) {
        const seatPosition = {
          x: sectionTemplate.position.x + (seatNum - 1) * seatSpacing.x,
          y: sectionTemplate.position.y + row * rowSpacing,
          width: 30,
          height: 30,
        };

        const seat = this.enhancedSeatRepository.create({
          venueMapId,
          sectionId: sectionTemplate.id,
          sectionName: sectionTemplate.name,
          row: rowLabel,
          number: seatNum.toString(),
          label: `${sectionTemplate.name} ${rowLabel}-${seatNum}`,
          status: EnhancedSeatStatus.AVAILABLE,
          type: EnhancedSeatType.STANDARD,
          accessibilityType: AccessibilityType.NONE,
          basePrice: sectionTemplate.basePrice,
          currentPrice: sectionTemplate.basePrice,
          position: seatPosition,
          pricingTierId: standardTier?.id,
          isActive: true,
          isSelectable: true,
          popularityScore: 1.0,
          selectionCount: 0,
        });

        seats.push(seat);
      }
    }

    await this.enhancedSeatRepository.save(seats);
  }

  private async createVipSectionFromTemplate(
    venueMapId: string,
    vipTemplate: any
  ): Promise<void> {
    const vipSection = this.vipSectionRepository.create({
      venueMapId,
      name: vipTemplate.name,
      vipType: vipTemplate.vipType || VipSectionType.PREMIUM_SEATING,
      accessLevel: vipTemplate.accessLevel || VipAccessLevel.STANDARD_VIP,
      capacity: vipTemplate.capacity,
      basePrice: vipTemplate.basePrice,
      packagePrice: vipTemplate.packagePrice,
      boundaries: vipTemplate.boundaries,
      amenities: vipTemplate.amenities,
      colorCode: vipTemplate.colorCode || '#FFD700',
      isActive: true,
      isBookable: true,
    });

    await this.vipSectionRepository.save(vipSection);
  }

  private async createAccessibilityFeatureFromTemplate(
    venueMapId: string,
    accessibilityTemplate: any
  ): Promise<void> {
    const feature = this.accessibilityFeatureRepository.create({
      venueMapId,
      featureType: accessibilityTemplate.featureType,
      name: accessibilityTemplate.name,
      description: accessibilityTemplate.description,
      location: accessibilityTemplate.location,
      capacity: accessibilityTemplate.capacity,
      isActive: true,
      isAvailable: true,
    });

    await this.accessibilityFeatureRepository.save(feature);
  }

  private async generateVenueSVG(venueMapId: string): Promise<string> {
    const venueMap = await this.venueMapRepository.findOne({
      where: { id: venueMapId },
    });

    const seats = await this.enhancedSeatRepository.find({
      where: { venueMapId, isActive: true },
    });

    const vipSections = await this.vipSectionRepository.find({
      where: { venueMapId, isActive: true },
    });

    // Generate SVG
    let svg = `<svg width="${venueMap.mapConfiguration.width}" height="${venueMap.mapConfiguration.height}" viewBox="${venueMap.mapConfiguration.viewBox}" xmlns="http://www.w3.org/2000/svg">`;

    // Add background
    svg += `<rect width="100%" height="100%" fill="${venueMap.styling?.backgroundColor || '#f8f9fa'}"/>`;

    // Add VIP sections
    for (const vipSection of vipSections) {
      const bounds = vipSection.boundaries;
      svg += `<rect id="vip-section-${vipSection.id}" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${vipSection.colorCode}" opacity="0.2" stroke="${vipSection.colorCode}" stroke-width="2"/>`;
      svg += `<text x="${bounds.x + bounds.width/2}" y="${bounds.y + bounds.height/2}" text-anchor="middle" fill="#000" font-size="12">${vipSection.name}</text>`;
    }

    // Add seats
    for (const seat of seats) {
      const color = this.getSeatColor(seat, venueMap.styling);
      svg += `<rect id="seat-${seat.id}" x="${seat.position.x}" y="${seat.position.y}" width="${seat.position.width}" height="${seat.position.height}" fill="${color}" stroke="#333" stroke-width="1" rx="3"/>`;
      
      if (venueMap.interactionSettings?.showSeatLabels) {
        svg += `<text x="${seat.position.x + seat.position.width/2}" y="${seat.position.y + seat.position.height/2 + 3}" text-anchor="middle" fill="#fff" font-size="8">${seat.number}</text>`;
      }
    }

    svg += '</svg>';
    return svg;
  }

  private getSeatColor(seat: EnhancedSeat, styling: any): string {
    const colors = styling?.seatColors || {
      available: '#10B981',
      selected: '#3B82F6',
      sold: '#EF4444',
      held: '#F59E0B',
      blocked: '#6B7280',
      wheelchair: '#8B5CF6',
      vip: '#F59E0B',
    };

    if (seat.accessibilityType === AccessibilityType.WHEELCHAIR) {
      return colors.wheelchair;
    }

    if (seat.type === EnhancedSeatType.VIP) {
      return colors.vip;
    }

    return colors[seat.status] || colors.available;
  }

  private async updateVenueMapCounts(venueMapId: string): Promise<void> {
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

    await this.venueMapRepository.update(venueMapId, {
      totalSeats,
      availableSeats: statusCounts[EnhancedSeatStatus.AVAILABLE] || 0,
      soldSeats: statusCounts[EnhancedSeatStatus.SOLD] || 0,
      heldSeats: (statusCounts[EnhancedSeatStatus.HELD] || 0) + (statusCounts[EnhancedSeatStatus.RESERVED] || 0),
    });
  }

  private async finalizeVenueMap(venueMapId: string, svgData: string): Promise<void> {
    await this.updateVenueMapCounts(venueMapId);
    await this.venueMapRepository.update(venueMapId, { svgData });
  }

  private async getVenueStats(venueMapId: string): Promise<any> {
    const venueMap = await this.venueMapRepository.findOne({
      where: { id: venueMapId },
    });

    const seatStats = await this.enhancedSeatRepository
      .createQueryBuilder('seat')
      .select('seat.type', 'type')
      .addSelect('seat.accessibilityType', 'accessibilityType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(seat.basePrice)', 'avgPrice')
      .where('seat.venueMapId = :venueMapId', { venueMapId })
      .andWhere('seat.isActive = :isActive', { isActive: true })
      .groupBy('seat.type, seat.accessibilityType')
      .getRawMany();

    return {
      totalSeats: venueMap.totalSeats,
      seatStats,
      lastUpdated: new Date(),
    };
  }

  private getDefaultStyling(): any {
    return {
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      seatColors: {
        available: '#10B981',
        selected: '#3B82F6',
        sold: '#EF4444',
        held: '#F59E0B',
        blocked: '#6B7280',
        wheelchair: '#8B5CF6',
        vip: '#F59E0B',
      },
      fonts: {
        family: 'Arial, sans-serif',
        size: 12,
        color: '#333333',
      },
    };
  }
}
