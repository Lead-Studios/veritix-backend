import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { EnhancedSeat } from '../entities/enhanced-seat.entity';
import { SeatReservation } from '../entities/seat-reservation.entity';
import { VenueMap } from '../entities/venue-map.entity';
import { SeatSelectionService } from './seat-selection.service';
import { SeatReservationService } from './seat-reservation.service';
import { 
  TicketPurchaseIntegrationDto, 
  TicketGenerationDto, 
  SeatHoldDto, 
  SeatReleaseDto,
  PricingIntegrationDto,
  TicketPurchaseResponseDto,
  SeatPricingResponseDto,
  CartIntegrationDto,
  CheckoutIntegrationDto
} from '../dto/ticket-integration.dto';

@Injectable()
export class TicketIntegrationService {
  private readonly logger = new Logger(TicketIntegrationService.name);

  constructor(
    @InjectRepository(EnhancedSeat)
    private seatRepository: Repository<EnhancedSeat>,
    @InjectRepository(SeatReservation)
    private reservationRepository: Repository<SeatReservation>,
    @InjectRepository(VenueMap)
    private venueMapRepository: Repository<VenueMap>,
    private seatSelectionService: SeatSelectionService,
    private seatReservationService: SeatReservationService,
    private entityManager: EntityManager,
  ) {}

  /**
   * Initialize cart with seat holds
   */
  async initializeCart(dto: CartIntegrationDto): Promise<{ success: boolean; reservationIds: string[]; expiresAt: Date }> {
    this.logger.log(`Initializing cart ${dto.cartId} with ${dto.seatIds.length} seats`);

    try {
      const reservationIds: string[] = [];
      const expiresAt = new Date(Date.now() + dto.expiryMinutes * 60 * 1000);

      // Hold each seat in the cart
      for (const seatId of dto.seatIds) {
        const reservation = await this.seatReservationService.createReservation({
          seatId,
          sessionId: dto.sessionId,
          userId: dto.userId,
          type: 'temporary',
          expirationMinutes: dto.expiryMinutes,
          metadata: {
            cartId: dto.cartId,
            source: 'cart_initialization'
          }
        });
        reservationIds.push(reservation.id);
      }

      this.logger.log(`Cart ${dto.cartId} initialized with ${reservationIds.length} seat reservations`);
      return { success: true, reservationIds, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to initialize cart ${dto.cartId}:`, error);
      throw new BadRequestException(`Failed to initialize cart: ${error.message}`);
    }
  }

  /**
   * Upgrade cart reservations to checkout
   */
  async initiateCheckout(dto: CheckoutIntegrationDto): Promise<{ success: boolean; checkoutExpiresAt: Date }> {
    this.logger.log(`Initiating checkout for cart ${dto.cartId}`);

    try {
      // Find all reservations for this cart
      const reservations = await this.reservationRepository.find({
        where: {
          sessionId: dto.sessionId,
          status: 'active'
        }
      });

      if (reservations.length === 0) {
        throw new BadRequestException('No active reservations found for cart');
      }

      const checkoutExpiresAt = new Date(Date.now() + dto.checkoutDurationMinutes * 60 * 1000);

      // Upgrade reservations to checkout type
      await this.entityManager.transaction(async manager => {
        for (const reservation of reservations) {
          await manager.update(SeatReservation, reservation.id, {
            type: 'checkout' as any,
            expiresAt: checkoutExpiresAt
          });
        }
      });

      this.logger.log(`Checkout initiated for cart ${dto.cartId} with ${reservations.length} seats`);
      return { success: true, checkoutExpiresAt };
    } catch (error) {
      this.logger.error(`Failed to initiate checkout for cart ${dto.cartId}:`, error);
      throw new BadRequestException(`Failed to initiate checkout: ${error.message}`);
    }
  }

  /**
   * Calculate pricing for selected seats
   */
  async calculatePricing(dto: PricingIntegrationDto): Promise<SeatPricingResponseDto> {
    this.logger.log(`Calculating pricing for ${dto.seatIds.length} seats`);

    try {
      const seats = await this.seatRepository.find({
        where: { id: In(dto.seatIds) },
        relations: ['pricingTier']
      });

      if (seats.length !== dto.seatIds.length) {
        throw new BadRequestException('Some seats not found');
      }

      const seatPricing = [];
      let totalBaseAmount = 0;
      let totalDiscountAmount = 0;
      let totalFeeAmount = 0;

      for (const seat of seats) {
        const basePrice = seat.basePrice;
        let dynamicPrice = basePrice;
        
        // Apply dynamic pricing if enabled
        if (dto.applyDynamicPricing && seat.pricingTier) {
          const multiplier = seat.pricingTier.pricingMultiplier || 1;
          dynamicPrice = basePrice * multiplier;
        }

        const discounts = [];
        const fees = [];
        let finalPrice = dynamicPrice;

        // Apply group discount
        if (dto.groupDiscount && dto.groupDiscount > 0) {
          const discountAmount = dynamicPrice * (dto.groupDiscount / 100);
          discounts.push({
            type: 'group',
            amount: discountAmount,
            description: `Group discount (${dto.groupDiscount}%)`
          });
          finalPrice -= discountAmount;
          totalDiscountAmount += discountAmount;
        }

        // Apply discount code (placeholder logic)
        if (dto.discountCode) {
          const discountAmount = dynamicPrice * 0.1; // 10% discount example
          discounts.push({
            type: 'promo',
            amount: discountAmount,
            description: `Promo code: ${dto.discountCode}`
          });
          finalPrice -= discountAmount;
          totalDiscountAmount += discountAmount;
        }

        // Add service fees
        const serviceFee = finalPrice * 0.05; // 5% service fee
        fees.push({
          type: 'service',
          amount: serviceFee,
          description: 'Service fee'
        });
        finalPrice += serviceFee;
        totalFeeAmount += serviceFee;

        seatPricing.push({
          seatId: seat.id,
          basePrice,
          dynamicPrice,
          finalPrice,
          discounts,
          fees
        });

        totalBaseAmount += basePrice;
      }

      const finalTotalAmount = totalBaseAmount - totalDiscountAmount + totalFeeAmount;

      return {
        seatPricing,
        totalBaseAmount,
        totalDiscountAmount,
        totalFeeAmount,
        finalTotalAmount,
        calculatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to calculate pricing:', error);
      throw new BadRequestException(`Failed to calculate pricing: ${error.message}`);
    }
  }

  /**
   * Hold seats for a specific duration
   */
  async holdSeats(dto: SeatHoldDto): Promise<{ success: boolean; holdExpiresAt: Date; reservationIds: string[] }> {
    this.logger.log(`Holding ${dto.seatIds.length} seats for ${dto.holdDurationMinutes} minutes`);

    try {
      const reservationIds: string[] = [];
      const holdExpiresAt = new Date(Date.now() + dto.holdDurationMinutes * 60 * 1000);

      await this.entityManager.transaction(async manager => {
        for (const seatId of dto.seatIds) {
          // Check if seat is available
          const seat = await manager.findOne(EnhancedSeat, { 
            where: { id: seatId },
            lock: { mode: 'pessimistic_write' }
          });

          if (!seat || seat.status !== 'available') {
            throw new ConflictException(`Seat ${seatId} is not available for hold`);
          }

          // Create hold reservation
          const reservation = await manager.save(SeatReservation, {
            seatId,
            sessionId: dto.holdReference,
            type: dto.holdType as any,
            status: 'active' as any,
            expiresAt: holdExpiresAt
          });

          // Update seat status
          await manager.update(EnhancedSeat, seatId, {
            status: 'held' as any
          });

          reservationIds.push(reservation.id);
        }
      });

      this.logger.log(`Successfully held ${dto.seatIds.length} seats until ${holdExpiresAt}`);
      return { success: true, holdExpiresAt, reservationIds };
    } catch (error) {
      this.logger.error('Failed to hold seats:', error);
      throw error;
    }
  }

  /**
   * Release held seats
   */
  async releaseSeats(dto: SeatReleaseDto): Promise<{ success: boolean; releasedCount: number }> {
    this.logger.log(`Releasing ${dto.seatIds.length} seats with reason: ${dto.reason}`);

    try {
      let releasedCount = 0;

      await this.entityManager.transaction(async manager => {
        for (const seatId of dto.seatIds) {
          // Find active reservations for this seat
          const reservations = await manager.find(SeatReservation, {
            where: {
              seatId,
              status: 'active',
              sessionId: dto.referenceId
            }
          });

          for (const reservation of reservations) {
            // Release reservation
            await manager.update(SeatReservation, reservation.id, {
              status: 'released' as any,
              releasedAt: new Date()
            });

            // Update seat status back to available
            await manager.update(EnhancedSeat, seatId, {
              status: 'available' as any
            });

            releasedCount++;
          }
        }
      });

      this.logger.log(`Successfully released ${releasedCount} seat reservations`);
      return { success: true, releasedCount };
    } catch (error) {
      this.logger.error('Failed to release seats:', error);
      throw new BadRequestException(`Failed to release seats: ${error.message}`);
    }
  }

  /**
   * Complete ticket purchase and generate tickets
   */
  async completePurchase(dto: TicketPurchaseIntegrationDto): Promise<TicketPurchaseResponseDto> {
    this.logger.log(`Completing purchase for session ${dto.sessionId} with ${dto.seatIds.length} seats`);

    try {
      return await this.entityManager.transaction(async manager => {
        // Find all reservations for this session
        const reservations = await manager.find(SeatReservation, {
          where: {
            sessionId: dto.sessionId,
            status: 'active'
          },
          relations: ['seat', 'seat.section']
        });

        if (reservations.length === 0) {
          throw new BadRequestException('No active reservations found for session');
        }

        // Verify all requested seats are reserved
        const reservedSeatIds = reservations.map(r => r.seatId);
        const missingSeats = dto.seatIds.filter(id => !reservedSeatIds.includes(id));
        if (missingSeats.length > 0) {
          throw new BadRequestException(`Seats not reserved: ${missingSeats.join(', ')}`);
        }

        // Generate order ID
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Complete reservations and mark seats as sold
        const ticketIds: string[] = [];
        const seats: any[] = [];

        for (const reservation of reservations) {
          if (dto.seatIds.includes(reservation.seatId)) {
            // Complete reservation
            await manager.update(SeatReservation, reservation.id, {
              status: 'completed' as any,
              completedAt: new Date()
            });

            // Mark seat as sold
            await manager.update(EnhancedSeat, reservation.seatId, {
              status: 'sold' as any
            });

            // Generate ticket ID
            const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            ticketIds.push(ticketId);

            seats.push({
              seatId: reservation.seatId,
              sectionName: 'Section',
              row: reservation.seat.row,
              number: reservation.seat.number,
              price: reservation.seat.basePrice,
              ticketId
            });
          }
        }

        this.logger.log(`Purchase completed: Order ${orderId}, ${ticketIds.length} tickets generated`);

        return {
          success: true,
          orderId,
          ticketIds,
          totalAmount: dto.totalAmount,
          transactionId,
          seats,
          purchaseDate: new Date()
        };
      });
    } catch (error) {
      this.logger.error('Failed to complete purchase:', error);
      return {
        success: false,
        orderId: '',
        ticketIds: [],
        totalAmount: 0,
        transactionId: '',
        seats: [],
        purchaseDate: new Date(),
        errorMessage: error.message
      };
    }
  }

  /**
   * Generate tickets from completed reservations
   */
  async generateTickets(dto: TicketGenerationDto): Promise<{ success: boolean; ticketIds: string[]; errorMessage?: string }> {
    this.logger.log(`Generating tickets for order ${dto.orderId}`);

    try {
      const reservations = await this.reservationRepository.find({
        where: { 
          id: In(dto.reservationIds),
          status: 'completed' as any
        },
        relations: ['seat']
      });

      if (reservations.length !== dto.reservationIds.length) {
        throw new BadRequestException('Some reservations not found or not completed');
      }

      const ticketIds: string[] = [];

      for (const reservation of reservations) {
        const ticketId = `TICKET-${dto.orderId}-${reservation.seatId}-${Date.now()}`;
        ticketIds.push(ticketId);

        // Update reservation with ticket information
        // Update reservation with ticket ID in a separate metadata field
        // This would typically be handled by a proper ticket entity
      }

      this.logger.log(`Generated ${ticketIds.length} tickets for order ${dto.orderId}`);
      return { success: true, ticketIds };
    } catch (error) {
      this.logger.error('Failed to generate tickets:', error);
      return { 
        success: false, 
        ticketIds: [], 
        errorMessage: error.message 
      };
    }
  }

  /**
   * Get reservation status for integration
   */
  async getReservationStatus(sessionId: string): Promise<{
    reservations: Array<{
      id: string;
      seatId: string;
      status: string;
      expiresAt: Date;
      seatDetails: any;
    }>;
    totalReserved: number;
    expiresAt: Date | null;
  }> {
    const reservations = await this.reservationRepository.find({
      where: { sessionId, status: 'active' as any },
      relations: ['seat'],
      order: { createdAt: 'ASC' }
    });

    const reservationDetails = reservations.map(r => ({
      id: r.id,
      seatId: r.seatId,
      status: r.status,
      expiresAt: r.expiresAt,
      seatDetails: {
        section: 'Section',
        row: r.seat.row,
        number: r.seat.number,
        price: r.seat.basePrice
      }
    }));

    const earliestExpiry = reservations.length > 0 
      ? reservations.reduce((earliest, r) => 
          r.expiresAt < earliest ? r.expiresAt : earliest, reservations[0].expiresAt)
      : null;

    return {
      reservations: reservationDetails,
      totalReserved: reservations.length,
      expiresAt: earliestExpiry
    };
  }
}
