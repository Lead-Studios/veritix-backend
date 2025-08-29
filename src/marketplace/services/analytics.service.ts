import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { ServiceListing } from '../entities/service-listing.entity';
import { ServiceBooking } from '../entities/service-booking.entity';
import { Commission } from '../entities/commission.entity';
import { VendorReview } from '../entities/vendor-review.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(ServiceListing)
    private serviceRepository: Repository<ServiceListing>,
    @InjectRepository(ServiceBooking)
    private bookingRepository: Repository<ServiceBooking>,
    @InjectRepository(Commission)
    private commissionRepository: Repository<Commission>,
    @InjectRepository(VendorReview)
    private reviewRepository: Repository<VendorReview>,
  ) {}

  async getVendorDashboard(vendorId: string, dateRange?: { start: Date; end: Date }) {
    const baseQuery = dateRange ? 
      { vendorId, createdAt: Between(dateRange.start, dateRange.end) } :
      { vendorId };

    const [
      bookingStats,
      revenueStats,
      serviceStats,
      reviewStats,
      recentBookings,
      topServices,
    ] = await Promise.all([
      this.getBookingStats(baseQuery),
      this.getRevenueStats(baseQuery),
      this.getServiceStats(vendorId),
      this.getReviewStats(vendorId, dateRange),
      this.getRecentBookings(vendorId, 5),
      this.getTopServices(vendorId, 5),
    ]);

    return {
      bookingStats,
      revenueStats,
      serviceStats,
      reviewStats,
      recentBookings,
      topServices,
      dateRange,
    };
  }

  async getMarketplaceDashboard(dateRange?: { start: Date; end: Date }) {
    const [
      platformStats,
      vendorStats,
      serviceStats,
      bookingStats,
      revenueStats,
      topVendors,
      topServices,
    ] = await Promise.all([
      this.getPlatformStats(dateRange),
      this.getVendorOverview(dateRange),
      this.getServiceOverview(dateRange),
      this.getBookingOverview(dateRange),
      this.getRevenueOverview(dateRange),
      this.getTopVendors(10),
      this.getTopMarketplaceServices(10),
    ]);

    return {
      platformStats,
      vendorStats,
      serviceStats,
      bookingStats,
      revenueStats,
      topVendors,
      topServices,
      dateRange,
    };
  }

  private async getBookingStats(filters: any) {
    const result = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('COUNT(booking.id)', 'totalBookings')
      .addSelect('COUNT(CASE WHEN booking.status = :confirmed THEN 1 END)', 'confirmedBookings')
      .addSelect('COUNT(CASE WHEN booking.status = :completed THEN 1 END)', 'completedBookings')
      .addSelect('COUNT(CASE WHEN booking.status = :cancelled THEN 1 END)', 'cancelledBookings')
      .where('booking.vendorId = :vendorId', { vendorId: filters.vendorId })
      .setParameters({ confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled' })
      .getRawOne();

    return {
      total: parseInt(result.totalBookings) || 0,
      confirmed: parseInt(result.confirmedBookings) || 0,
      completed: parseInt(result.completedBookings) || 0,
      cancelled: parseInt(result.cancelledBookings) || 0,
      completionRate: result.totalBookings > 0 ? 
        (parseInt(result.completedBookings) / parseInt(result.totalBookings)) * 100 : 0,
    };
  }

  private async getRevenueStats(filters: any) {
    const result = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalAmount)', 'totalRevenue')
      .addSelect('AVG(booking.totalAmount)', 'averageBookingValue')
      .addSelect('SUM(CASE WHEN booking.status = :completed THEN booking.totalAmount ELSE 0 END)', 'completedRevenue')
      .where('booking.vendorId = :vendorId', { vendorId: filters.vendorId })
      .setParameter('completed', 'completed')
      .getRawOne();

    return {
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      completedRevenue: parseFloat(result.completedRevenue) || 0,
      averageBookingValue: parseFloat(result.averageBookingValue) || 0,
    };
  }

  private async getServiceStats(vendorId: string) {
    const result = await this.serviceRepository
      .createQueryBuilder('service')
      .select('COUNT(service.id)', 'totalServices')
      .addSelect('COUNT(CASE WHEN service.status = :active THEN 1 END)', 'activeServices')
      .addSelect('AVG(service.averageRating)', 'averageRating')
      .addSelect('SUM(service.viewCount)', 'totalViews')
      .where('service.vendorId = :vendorId', { vendorId })
      .setParameter('active', 'active')
      .getRawOne();

    return {
      total: parseInt(result.totalServices) || 0,
      active: parseInt(result.activeServices) || 0,
      averageRating: parseFloat(result.averageRating) || 0,
      totalViews: parseInt(result.totalViews) || 0,
    };
  }

  private async getReviewStats(vendorId: string, dateRange?: { start: Date; end: Date }) {
    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'totalReviews')
      .addSelect('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(CASE WHEN review.rating >= 4 THEN 1 END)', 'positiveReviews')
      .where('review.vendorId = :vendorId', { vendorId })
      .andWhere('review.status = :approved', { approved: 'approved' });

    if (dateRange) {
      queryBuilder.andWhere('review.createdAt BETWEEN :start AND :end', dateRange);
    }

    const result = await queryBuilder.getRawOne();

    return {
      total: parseInt(result.totalReviews) || 0,
      averageRating: parseFloat(result.averageRating) || 0,
      positiveReviews: parseInt(result.positiveReviews) || 0,
      positiveRate: result.totalReviews > 0 ? 
        (parseInt(result.positiveReviews) / parseInt(result.totalReviews)) * 100 : 0,
    };
  }

  private async getRecentBookings(vendorId: string, limit: number) {
    return this.bookingRepository.find({
      where: { vendorId },
      relations: ['organizer', 'service'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private async getTopServices(vendorId: string, limit: number) {
    return this.serviceRepository.find({
      where: { vendorId },
      order: { totalBookings: 'DESC', averageRating: 'DESC' },
      take: limit,
    });
  }

  private async getPlatformStats(dateRange?: { start: Date; end: Date }) {
    const vendorQuery = this.vendorRepository.createQueryBuilder('vendor');
    const serviceQuery = this.serviceRepository.createQueryBuilder('service');
    const bookingQuery = this.bookingRepository.createQueryBuilder('booking');

    if (dateRange) {
      vendorQuery.where('vendor.createdAt BETWEEN :start AND :end', dateRange);
      serviceQuery.where('service.createdAt BETWEEN :start AND :end', dateRange);
      bookingQuery.where('booking.createdAt BETWEEN :start AND :end', dateRange);
    }

    const [vendorCount, serviceCount, bookingCount] = await Promise.all([
      vendorQuery.getCount(),
      serviceQuery.getCount(),
      bookingQuery.getCount(),
    ]);

    return {
      totalVendors: vendorCount,
      totalServices: serviceCount,
      totalBookings: bookingCount,
    };
  }

  private async getVendorOverview(dateRange?: { start: Date; end: Date }) {
    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .select('COUNT(vendor.id)', 'total')
      .addSelect('COUNT(CASE WHEN vendor.status = :active THEN 1 END)', 'active')
      .addSelect('COUNT(CASE WHEN vendor.isVerified = true THEN 1 END)', 'verified')
      .setParameter('active', 'active');

    if (dateRange) {
      queryBuilder.where('vendor.createdAt BETWEEN :start AND :end', dateRange);
    }

    return queryBuilder.getRawOne();
  }

  private async getServiceOverview(dateRange?: { start: Date; end: Date }) {
    const queryBuilder = this.serviceRepository
      .createQueryBuilder('service')
      .select('COUNT(service.id)', 'total')
      .addSelect('COUNT(CASE WHEN service.status = :active THEN 1 END)', 'active')
      .addSelect('AVG(service.averageRating)', 'averageRating')
      .setParameter('active', 'active');

    if (dateRange) {
      queryBuilder.where('service.createdAt BETWEEN :start AND :end', dateRange);
    }

    return queryBuilder.getRawOne();
  }

  private async getBookingOverview(dateRange?: { start: Date; end: Date }) {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .select('COUNT(booking.id)', 'total')
      .addSelect('COUNT(CASE WHEN booking.status = :completed THEN 1 END)', 'completed')
      .addSelect('SUM(booking.totalAmount)', 'totalValue')
      .setParameter('completed', 'completed');

    if (dateRange) {
      queryBuilder.where('booking.createdAt BETWEEN :start AND :end', dateRange);
    }

    return queryBuilder.getRawOne();
  }

  private async getRevenueOverview(dateRange?: { start: Date; end: Date }) {
    const queryBuilder = this.commissionRepository
      .createQueryBuilder('commission')
      .select('SUM(commission.bookingAmount)', 'totalRevenue')
      .addSelect('SUM(commission.commissionAmount)', 'totalCommissions')
      .addSelect('SUM(commission.vendorPayout)', 'totalPayouts');

    if (dateRange) {
      queryBuilder.where('commission.createdAt BETWEEN :start AND :end', dateRange);
    }

    return queryBuilder.getRawOne();
  }

  private async getTopVendors(limit: number) {
    return this.vendorRepository.find({
      where: { isActive: true },
      relations: ['profile'],
      order: { totalRevenue: 'DESC', averageRating: 'DESC' },
      take: limit,
    });
  }

  private async getTopMarketplaceServices(limit: number) {
    return this.serviceRepository.find({
      where: { isActive: true },
      relations: ['vendor', 'category'],
      order: { totalBookings: 'DESC', averageRating: 'DESC' },
      take: limit,
    });
  }
}
