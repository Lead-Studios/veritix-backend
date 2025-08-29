import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Commission, CommissionStatus, CommissionType } from '../entities/commission.entity';
import { PaymentDistribution, DistributionStatus } from '../entities/payment-distribution.entity';
import { ServiceBooking } from '../entities/service-booking.entity';
import { Vendor } from '../entities/vendor.entity';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(Commission)
    private commissionRepository: Repository<Commission>,
    @InjectRepository(PaymentDistribution)
    private distributionRepository: Repository<PaymentDistribution>,
    @InjectRepository(ServiceBooking)
    private bookingRepository: Repository<ServiceBooking>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  async createCommissionForBooking(booking: ServiceBooking): Promise<Commission> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: booking.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const commissionNumber = await this.generateCommissionNumber();
    const commissionRate = vendor.commissionRate;
    const commissionAmount = booking.totalAmount * (commissionRate / 100);
    const processingFee = booking.totalAmount * 0.029; // 2.9% processing fee
    const platformFee = booking.totalAmount * 0.005; // 0.5% platform fee
    const vendorPayout = booking.totalAmount - commissionAmount - processingFee - platformFee;

    const commission = this.commissionRepository.create({
      commissionNumber,
      vendorId: booking.vendorId,
      bookingId: booking.id,
      commissionType: CommissionType.BOOKING,
      status: CommissionStatus.PENDING,
      bookingAmount: booking.totalAmount,
      commissionRate,
      commissionAmount,
      vendorPayout,
      processingFee,
      platformFee,
      currency: booking.currency,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      description: `Commission for booking ${booking.bookingNumber}`,
    });

    return this.commissionRepository.save(commission);
  }

  async calculateCommission(commissionId: string): Promise<Commission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId },
      relations: ['booking', 'vendor'],
    });

    if (!commission) {
      throw new NotFoundException('Commission not found');
    }

    if (commission.status !== CommissionStatus.PENDING) {
      throw new BadRequestException('Commission already calculated');
    }

    // Recalculate based on current booking amount
    const booking = commission.booking;
    const vendor = commission.vendor;
    
    const commissionRate = vendor.commissionRate;
    const commissionAmount = booking.totalAmount * (commissionRate / 100);
    const processingFee = booking.totalAmount * 0.029;
    const platformFee = booking.totalAmount * 0.005;
    const vendorPayout = booking.totalAmount - commissionAmount - processingFee - platformFee;

    commission.bookingAmount = booking.totalAmount;
    commission.commissionRate = commissionRate;
    commission.commissionAmount = commissionAmount;
    commission.vendorPayout = vendorPayout;
    commission.processingFee = processingFee;
    commission.platformFee = platformFee;
    commission.status = CommissionStatus.CALCULATED;
    commission.calculatedAt = new Date();

    return this.commissionRepository.save(commission);
  }

  async approveCommission(commissionId: string): Promise<Commission> {
    const commission = await this.findCommissionById(commissionId);

    if (commission.status !== CommissionStatus.CALCULATED) {
      throw new BadRequestException('Commission must be calculated before approval');
    }

    commission.status = CommissionStatus.APPROVED;
    commission.approvedAt = new Date();

    const updatedCommission = await this.commissionRepository.save(commission);

    // Create payment distribution
    await this.createPaymentDistribution(updatedCommission);

    return updatedCommission;
  }

  async processCommissionPayment(commissionId: string): Promise<Commission> {
    const commission = await this.findCommissionById(commissionId);

    if (commission.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException('Commission must be approved before payment');
    }

    // Update commission status
    commission.status = CommissionStatus.PAID;
    commission.paidAt = new Date();

    // Update payment distribution status
    if (commission.paymentDistribution) {
      commission.paymentDistribution.status = DistributionStatus.PROCESSING;
      commission.paymentDistribution.processedAt = new Date();
      await this.distributionRepository.save(commission.paymentDistribution);
    }

    return this.commissionRepository.save(commission);
  }

  async findCommissionById(id: string): Promise<Commission> {
    const commission = await this.commissionRepository.findOne({
      where: { id },
      relations: ['vendor', 'booking', 'paymentDistribution'],
    });

    if (!commission) {
      throw new NotFoundException('Commission not found');
    }

    return commission;
  }

  async getVendorCommissions(
    vendorId: string,
    filters: {
      status?: CommissionStatus;
      dateRange?: { start: Date; end: Date };
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    commissions: Commission[];
    total: number;
    summary: {
      totalEarnings: number;
      pendingAmount: number;
      paidAmount: number;
      totalCommissions: number;
    };
  }> {
    const { status, dateRange, page = 1, limit = 20 } = filters;

    const queryBuilder = this.commissionRepository
      .createQueryBuilder('commission')
      .leftJoinAndSelect('commission.booking', 'booking')
      .leftJoinAndSelect('commission.paymentDistribution', 'distribution')
      .where('commission.vendorId = :vendorId', { vendorId });

    if (status) {
      queryBuilder.andWhere('commission.status = :status', { status });
    }

    if (dateRange) {
      queryBuilder.andWhere('commission.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    // Get total count and summary
    const [commissions, total] = await queryBuilder
      .orderBy('commission.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Calculate summary
    const summaryQuery = this.commissionRepository
      .createQueryBuilder('commission')
      .select('SUM(commission.vendorPayout)', 'totalEarnings')
      .addSelect('SUM(CASE WHEN commission.status IN (:...pendingStatuses) THEN commission.vendorPayout ELSE 0 END)', 'pendingAmount')
      .addSelect('SUM(CASE WHEN commission.status = :paidStatus THEN commission.vendorPayout ELSE 0 END)', 'paidAmount')
      .addSelect('COUNT(commission.id)', 'totalCommissions')
      .where('commission.vendorId = :vendorId', { vendorId })
      .setParameters({
        pendingStatuses: [CommissionStatus.PENDING, CommissionStatus.CALCULATED, CommissionStatus.APPROVED],
        paidStatus: CommissionStatus.PAID,
      });

    if (dateRange) {
      summaryQuery.andWhere('commission.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const summary = await summaryQuery.getRawOne();

    return {
      commissions,
      total,
      summary: {
        totalEarnings: parseFloat(summary.totalEarnings) || 0,
        pendingAmount: parseFloat(summary.pendingAmount) || 0,
        paidAmount: parseFloat(summary.paidAmount) || 0,
        totalCommissions: parseInt(summary.totalCommissions) || 0,
      },
    };
  }

  async getPlatformCommissionSummary(
    dateRange?: { start: Date; end: Date },
  ): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    totalProcessingFees: number;
    totalPlatformFees: number;
    vendorPayouts: number;
    commissionsByStatus: Record<CommissionStatus, number>;
  }> {
    const queryBuilder = this.commissionRepository
      .createQueryBuilder('commission')
      .select('SUM(commission.bookingAmount)', 'totalRevenue')
      .addSelect('SUM(commission.commissionAmount)', 'totalCommissions')
      .addSelect('SUM(commission.processingFee)', 'totalProcessingFees')
      .addSelect('SUM(commission.platformFee)', 'totalPlatformFees')
      .addSelect('SUM(commission.vendorPayout)', 'vendorPayouts');

    if (dateRange) {
      queryBuilder.where('commission.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const summary = await queryBuilder.getRawOne();

    // Get commission counts by status
    const statusQuery = this.commissionRepository
      .createQueryBuilder('commission')
      .select('commission.status', 'status')
      .addSelect('COUNT(commission.id)', 'count');

    if (dateRange) {
      statusQuery.where('commission.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const statusCounts = await statusQuery
      .groupBy('commission.status')
      .getRawMany();

    const commissionsByStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<CommissionStatus, number>);

    return {
      totalRevenue: parseFloat(summary.totalRevenue) || 0,
      totalCommissions: parseFloat(summary.totalCommissions) || 0,
      totalProcessingFees: parseFloat(summary.totalProcessingFees) || 0,
      totalPlatformFees: parseFloat(summary.totalPlatformFees) || 0,
      vendorPayouts: parseFloat(summary.vendorPayouts) || 0,
      commissionsByStatus,
    };
  }

  async getOverdueCommissions(): Promise<Commission[]> {
    const today = new Date();
    
    return this.commissionRepository.find({
      where: {
        dueDate: Between(new Date('1900-01-01'), today),
        status: In([CommissionStatus.CALCULATED, CommissionStatus.APPROVED]),
      },
      relations: ['vendor', 'booking'],
      order: { dueDate: 'ASC' },
    });
  }

  async bulkApproveCommissions(commissionIds: string[]): Promise<Commission[]> {
    const commissions = await this.commissionRepository.find({
      where: {
        id: In(commissionIds),
        status: CommissionStatus.CALCULATED,
      },
    });

    if (commissions.length !== commissionIds.length) {
      throw new BadRequestException('Some commissions not found or not in calculated status');
    }

    const approvedCommissions = [];

    for (const commission of commissions) {
      commission.status = CommissionStatus.APPROVED;
      commission.approvedAt = new Date();
      
      const updatedCommission = await this.commissionRepository.save(commission);
      await this.createPaymentDistribution(updatedCommission);
      
      approvedCommissions.push(updatedCommission);
    }

    return approvedCommissions;
  }

  private async createPaymentDistribution(commission: Commission): Promise<PaymentDistribution> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: commission.vendorId },
    });

    if (!vendor.paymentMethods) {
      throw new BadRequestException('Vendor has no payment methods configured');
    }

    const distributionId = `DIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Determine payment method (prioritize in order: stripe, bank, paypal)
    let paymentMethod: any;
    if (vendor.paymentMethods.stripe) {
      paymentMethod = {
        type: 'stripe',
        details: vendor.paymentMethods.stripe,
      };
    } else if (vendor.paymentMethods.bankAccount) {
      paymentMethod = {
        type: 'bank_transfer',
        details: vendor.paymentMethods.bankAccount,
      };
    } else if (vendor.paymentMethods.paypal) {
      paymentMethod = {
        type: 'paypal',
        details: vendor.paymentMethods.paypal,
      };
    } else {
      throw new BadRequestException('No valid payment method found for vendor');
    }

    const distribution = this.distributionRepository.create({
      commissionId: commission.id,
      distributionId,
      status: DistributionStatus.PENDING,
      amount: commission.vendorPayout,
      currency: commission.currency,
      scheduledDate: commission.dueDate,
      paymentMethod,
    });

    return this.distributionRepository.save(distribution);
  }

  private async generateCommissionNumber(): Promise<string> {
    const prefix = 'COM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    let commissionNumber = `${prefix}${timestamp}${random}`;
    
    // Ensure uniqueness
    while (await this.commissionRepository.findOne({ where: { commissionNumber } })) {
      const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      commissionNumber = `${prefix}${timestamp}${newRandom}`;
    }
    
    return commissionNumber;
  }

  async retryFailedDistribution(distributionId: string): Promise<PaymentDistribution> {
    const distribution = await this.distributionRepository.findOne({
      where: { id: distributionId },
      relations: ['commission'],
    });

    if (!distribution) {
      throw new NotFoundException('Payment distribution not found');
    }

    if (distribution.status !== DistributionStatus.FAILED) {
      throw new BadRequestException('Only failed distributions can be retried');
    }

    distribution.status = DistributionStatus.PENDING;
    distribution.retryCount += 1;
    distribution.nextRetryAt = new Date(Date.now() + 60 * 60 * 1000); // Retry in 1 hour
    distribution.failureReason = null;

    return this.distributionRepository.save(distribution);
  }
}
