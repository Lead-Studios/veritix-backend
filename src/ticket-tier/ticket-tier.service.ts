import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { TicketTierResponseDto } from './dto/ticket-tier-response.dto';
import { EventsService } from '../events/events.service';
import { TicketTier } from './entities/ticket-tier.entity';
import { PricingStrategyService } from './services/pricing-strategy.service';
import { PricingStrategy } from './enums/pricing-strategy.enum';

@Injectable()
export class TicketTierService {
  constructor(
    @InjectRepository(TicketTier)
    private ticketTierRepo: Repository<TicketTier>,
    private readonly eventsService: EventsService,
    private readonly pricingStrategyService: PricingStrategyService,
  ) {}

  async create(
    eventId: string,
    dto: CreateTicketTierDto,
    userId: string,
  ): Promise<TicketTier> {
    const event = await this.eventsService.findOne(eventId);

    if (!event) throw new NotFoundException('Event not found');
    if (event.ownerId !== userId)
      throw new ForbiddenException('You do not own this event');

    // Set default pricing strategy if not provided
    const pricingStrategy = dto.pricingStrategy || PricingStrategy.FIXED;

    // Merge with default config if pricing config is not provided
    let pricingConfig = dto.pricingConfig;
    if (!pricingConfig && pricingStrategy !== PricingStrategy.FIXED) {
      const defaultConfig =
        this.pricingStrategyService.getDefaultConfig(pricingStrategy);
      pricingConfig = {
        maxPrice: defaultConfig.maxPrice,
        minPrice: defaultConfig.minPrice,
        demandMultiplier: defaultConfig.demandMultiplier,
        thresholds: defaultConfig.thresholds,
      };
    }

    const tier = this.ticketTierRepo.create({
      ...dto,
      eventId,
      pricingStrategy,
      pricingConfig,
    });

    return await this.ticketTierRepo.save(tier);
  }

  async findByEvent(eventId: string): Promise<TicketTierResponseDto[]> {
    const tiers = await this.ticketTierRepo.find({ where: { eventId } });

    const responsePromises = tiers.map(async (tier) => {
      return await this.enrichWithDynamicPricing(tier);
    });

    return Promise.all(responsePromises);
  }

  async findOne(id: string): Promise<TicketTierResponseDto> {
    const tier = await this.ticketTierRepo.findOne({ where: { id } });
    if (!tier) throw new NotFoundException('Ticket tier not found');

    return await this.enrichWithDynamicPricing(tier);
  }

  /**
   * Enrich ticket tier with dynamic pricing information
   */
  private async enrichWithDynamicPricing(
    tier: TicketTier,
  ): Promise<TicketTierResponseDto> {
    const config = {
      strategy: tier.pricingStrategy,
      basePrice: tier.price,
      maxPrice: tier.pricingConfig?.maxPrice,
      minPrice: tier.pricingConfig?.minPrice,
      demandMultiplier: tier.pricingConfig?.demandMultiplier,
      thresholds: tier.pricingConfig?.thresholds,
    };

    const dynamicPrice =
      await this.pricingStrategyService.calculateDynamicPrice(tier, config);

    return {
      id: tier.id,
      name: tier.name,
      originalPrice: dynamicPrice.originalPrice,
      currentPrice: dynamicPrice.currentPrice,
      quantity: tier.quantity,
      benefits: tier.benefits,
      pricingStrategy: tier.pricingStrategy,
      soldCount: dynamicPrice.soldCount,
      availableQuantity: tier.quantity - dynamicPrice.soldCount,
      soldPercentage: dynamicPrice.soldPercentage,
      pricingConfig: tier.pricingConfig,
      eventId: tier.eventId,
    };
  }

  /**
   * Get current price for a specific ticket tier (used in purchase flow)
   */
  async getCurrentPrice(tierId: string): Promise<number> {
    const tier = await this.ticketTierRepo.findOne({ where: { id: tierId } });
    if (!tier) throw new NotFoundException('Ticket tier not found');

    const config = {
      strategy: tier.pricingStrategy,
      basePrice: tier.price,
      maxPrice: tier.pricingConfig?.maxPrice,
      minPrice: tier.pricingConfig?.minPrice,
      demandMultiplier: tier.pricingConfig?.demandMultiplier,
      thresholds: tier.pricingConfig?.thresholds,
    };

    const dynamicPrice =
      await this.pricingStrategyService.calculateDynamicPrice(tier, config);
    return dynamicPrice.currentPrice;
  }
}
