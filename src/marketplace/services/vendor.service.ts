import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Vendor, VendorStatus, VendorTier } from '../entities/vendor.entity';
import { VendorProfile } from '../entities/vendor-profile.entity';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { VendorQueryDto } from '../dto/vendor-query.dto';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(VendorProfile)
    private vendorProfileRepository: Repository<VendorProfile>,
  ) {}

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    // Check if user is already a vendor
    const existingVendor = await this.vendorRepository.findOne({
      where: { userId: createVendorDto.userId },
    });

    if (existingVendor) {
      throw new BadRequestException('User is already registered as a vendor');
    }

    // Check business name uniqueness
    const existingBusinessName = await this.vendorRepository.findOne({
      where: { businessName: createVendorDto.businessName },
    });

    if (existingBusinessName) {
      throw new BadRequestException('Business name already exists');
    }

    const vendor = this.vendorRepository.create({
      ...createVendorDto,
      status: VendorStatus.PENDING,
      tier: VendorTier.BASIC,
    });

    const savedVendor = await this.vendorRepository.save(vendor);

    // Create vendor profile if provided
    if (createVendorDto.profile) {
      const profile = this.vendorProfileRepository.create({
        vendorId: savedVendor.id,
        ...createVendorDto.profile,
      });
      await this.vendorProfileRepository.save(profile);
    }

    return this.findOne(savedVendor.id);
  }

  async findAll(query: VendorQueryDto): Promise<{
    vendors: Vendor[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      tier,
      isVerified,
      isFeatured,
      serviceAreas,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.profile', 'profile')
      .leftJoinAndSelect('vendor.user', 'user');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('vendor.status = :status', { status });
    }

    if (tier) {
      queryBuilder.andWhere('vendor.tier = :tier', { tier });
    }

    if (typeof isVerified === 'boolean') {
      queryBuilder.andWhere('vendor.isVerified = :isVerified', { isVerified });
    }

    if (typeof isFeatured === 'boolean') {
      queryBuilder.andWhere('vendor.isFeatured = :isFeatured', { isFeatured });
    }

    if (serviceAreas && serviceAreas.length > 0) {
      queryBuilder.andWhere(
        'JSON_OVERLAPS(vendor.serviceAreas, :serviceAreas)',
        { serviceAreas: JSON.stringify(serviceAreas) },
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(vendor.businessName LIKE :search OR profile.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`vendor.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [vendors, total] = await queryBuilder.getManyAndCount();

    return {
      vendors,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: [
        'profile',
        'user',
        'services',
        'reviews',
        'bookings',
        'commissions',
      ],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async findByUserId(userId: string): Promise<Vendor | null> {
    return this.vendorRepository.findOne({
      where: { userId },
      relations: ['profile', 'user'],
    });
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    // Check business name uniqueness if changed
    if (
      updateVendorDto.businessName &&
      updateVendorDto.businessName !== vendor.businessName
    ) {
      const existingBusinessName = await this.vendorRepository.findOne({
        where: { businessName: updateVendorDto.businessName },
      });

      if (existingBusinessName) {
        throw new BadRequestException('Business name already exists');
      }
    }

    Object.assign(vendor, updateVendorDto);
    const updatedVendor = await this.vendorRepository.save(vendor);

    // Update profile if provided
    if (updateVendorDto.profile) {
      if (vendor.profile) {
        Object.assign(vendor.profile, updateVendorDto.profile);
        await this.vendorProfileRepository.save(vendor.profile);
      } else {
        const profile = this.vendorProfileRepository.create({
          vendorId: vendor.id,
          ...updateVendorDto.profile,
        });
        await this.vendorProfileRepository.save(profile);
      }
    }

    return this.findOne(updatedVendor.id);
  }

  async updateStatus(id: string, status: VendorStatus): Promise<Vendor> {
    const vendor = await this.findOne(id);
    vendor.status = status;

    if (status === VendorStatus.ACTIVE) {
      vendor.verifiedAt = new Date();
      vendor.isVerified = true;
    }

    return this.vendorRepository.save(vendor);
  }

  async updateTier(id: string, tier: VendorTier): Promise<Vendor> {
    const vendor = await this.findOne(id);
    vendor.tier = tier;
    return this.vendorRepository.save(vendor);
  }

  async updateRating(vendorId: string): Promise<void> {
    const result = await this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoin('vendor.reviews', 'review')
      .select('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .where('vendor.id = :vendorId', { vendorId })
      .andWhere('review.status = :status', { status: 'approved' })
      .getRawOne();

    await this.vendorRepository.update(vendorId, {
      averageRating: parseFloat(result.avgRating) || 0,
      totalReviews: parseInt(result.totalReviews) || 0,
    });
  }

  async updateStats(vendorId: string): Promise<void> {
    const bookingStats = await this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoin('vendor.bookings', 'booking')
      .select('COUNT(booking.id)', 'totalBookings')
      .addSelect('SUM(booking.totalAmount)', 'totalRevenue')
      .where('vendor.id = :vendorId', { vendorId })
      .andWhere('booking.status = :status', { status: 'completed' })
      .getRawOne();

    await this.vendorRepository.update(vendorId, {
      totalBookings: parseInt(bookingStats.totalBookings) || 0,
      totalRevenue: parseFloat(bookingStats.totalRevenue) || 0,
      lastActiveAt: new Date(),
    });
  }

  async getFeaturedVendors(limit: number = 10): Promise<Vendor[]> {
    return this.vendorRepository.find({
      where: {
        isFeatured: true,
        isActive: true,
        status: VendorStatus.ACTIVE,
      },
      relations: ['profile', 'services'],
      order: { averageRating: 'DESC', totalReviews: 'DESC' },
      take: limit,
    });
  }

  async getTopRatedVendors(limit: number = 10): Promise<Vendor[]> {
    return this.vendorRepository.find({
      where: {
        isActive: true,
        status: VendorStatus.ACTIVE,
        totalReviews: 5, // Minimum 5 reviews
      },
      relations: ['profile', 'services'],
      order: { averageRating: 'DESC', totalReviews: 'DESC' },
      take: limit,
    });
  }

  async searchVendors(
    searchTerm: string,
    filters: {
      serviceType?: string;
      location?: string;
      priceRange?: { min: number; max: number };
      rating?: number;
    } = {},
  ): Promise<Vendor[]> {
    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.profile', 'profile')
      .leftJoinAndSelect('vendor.services', 'service')
      .where('vendor.isActive = :isActive', { isActive: true })
      .andWhere('vendor.status = :status', { status: VendorStatus.ACTIVE });

    if (searchTerm) {
      queryBuilder.andWhere(
        '(vendor.businessName LIKE :search OR profile.description LIKE :search OR service.title LIKE :search)',
        { search: `%${searchTerm}%` },
      );
    }

    if (filters.serviceType) {
      queryBuilder.andWhere('service.serviceType = :serviceType', {
        serviceType: filters.serviceType,
      });
    }

    if (filters.location) {
      queryBuilder.andWhere(
        'JSON_CONTAINS(vendor.serviceAreas, :location)',
        { location: JSON.stringify([filters.location]) },
      );
    }

    if (filters.rating) {
      queryBuilder.andWhere('vendor.averageRating >= :rating', {
        rating: filters.rating,
      });
    }

    return queryBuilder
      .orderBy('vendor.averageRating', 'DESC')
      .addOrderBy('vendor.totalReviews', 'DESC')
      .getMany();
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.findOne(id);
    
    // Soft delete by setting status to archived
    vendor.status = VendorStatus.REJECTED;
    vendor.isActive = false;
    await this.vendorRepository.save(vendor);
  }
}
