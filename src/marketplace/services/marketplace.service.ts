import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ServiceListing, ServiceStatus } from '../entities/service-listing.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { ServicePricing } from '../entities/service-pricing.entity';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { ServiceSearchDto } from '../dto/service-search.dto';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(ServiceListing)
    private serviceRepository: Repository<ServiceListing>,
    @InjectRepository(ServiceCategory)
    private categoryRepository: Repository<ServiceCategory>,
    @InjectRepository(ServicePricing)
    private pricingRepository: Repository<ServicePricing>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  async createService(createServiceDto: CreateServiceDto): Promise<ServiceListing> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: createServiceDto.vendorId, status: VendorStatus.ACTIVE },
    });

    if (!vendor) {
      throw new NotFoundException('Active vendor not found');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: createServiceDto.categoryId, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Active category not found');
    }

    // Generate unique slug
    const baseSlug = createServiceDto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.serviceRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const service = this.serviceRepository.create({
      ...createServiceDto,
      slug,
      status: ServiceStatus.DRAFT,
    });

    const savedService = await this.serviceRepository.save(service);

    // Create pricing if provided
    if (createServiceDto.pricing && createServiceDto.pricing.length > 0) {
      const pricingEntities = createServiceDto.pricing.map(pricing =>
        this.pricingRepository.create({
          ...pricing,
          serviceId: savedService.id,
        })
      );
      await this.pricingRepository.save(pricingEntities);
    }

    // Update category service count
    await this.updateCategoryServiceCount(createServiceDto.categoryId);

    return this.findServiceById(savedService.id);
  }

  async findServices(searchDto: ServiceSearchDto): Promise<{
    services: ServiceListing[];
    total: number;
    page: number;
    limit: number;
    filters: any;
  }> {
    const {
      page = 1,
      limit = 20,
      categoryId,
      serviceType,
      location,
      priceRange,
      rating,
      availability,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = searchDto;

    const queryBuilder = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vendor', 'vendor')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('service.pricing', 'pricing')
      .where('service.status = :status', { status: ServiceStatus.ACTIVE })
      .andWhere('service.isActive = :isActive', { isActive: true })
      .andWhere('vendor.status = :vendorStatus', { vendorStatus: VendorStatus.ACTIVE })
      .andWhere('vendor.isActive = :vendorActive', { vendorActive: true });

    // Apply filters
    if (categoryId) {
      queryBuilder.andWhere('service.categoryId = :categoryId', { categoryId });
    }

    if (serviceType) {
      queryBuilder.andWhere('service.serviceType = :serviceType', { serviceType });
    }

    if (location) {
      queryBuilder.andWhere(
        'JSON_CONTAINS(vendor.serviceAreas, :location)',
        { location: JSON.stringify([location]) }
      );
    }

    if (priceRange) {
      queryBuilder.andWhere(
        'pricing.basePrice BETWEEN :minPrice AND :maxPrice',
        { minPrice: priceRange.min, maxPrice: priceRange.max }
      );
    }

    if (rating) {
      queryBuilder.andWhere('service.averageRating >= :rating', { rating });
    }

    if (search) {
      queryBuilder.andWhere(
        '(service.title LIKE :search OR service.description LIKE :search OR vendor.businessName LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'averageRating', 'totalBookings', 'viewCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`service.${sortField}`, sortOrder);

    // Add secondary sorting
    if (sortField !== 'createdAt') {
      queryBuilder.addOrderBy('service.createdAt', 'DESC');
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [services, total] = await queryBuilder.getManyAndCount();

    return {
      services,
      total,
      page,
      limit,
      filters: {
        categoryId,
        serviceType,
        location,
        priceRange,
        rating,
        search,
      },
    };
  }

  async findServiceById(id: string): Promise<ServiceListing> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: [
        'vendor',
        'vendor.profile',
        'category',
        'pricing',
        'reviews',
        'bookings',
      ],
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Increment view count
    await this.serviceRepository.increment({ id }, 'viewCount', 1);

    return service;
  }

  async findServiceBySlug(slug: string): Promise<ServiceListing> {
    const service = await this.serviceRepository.findOne({
      where: { slug },
      relations: [
        'vendor',
        'vendor.profile',
        'category',
        'pricing',
        'reviews',
      ],
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Increment view count
    await this.serviceRepository.increment({ id: service.id }, 'viewCount', 1);

    return service;
  }

  async updateService(id: string, updateServiceDto: UpdateServiceDto): Promise<ServiceListing> {
    const service = await this.findServiceById(id);

    // Update slug if title changed
    if (updateServiceDto.title && updateServiceDto.title !== service.title) {
      const baseSlug = updateServiceDto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      let slug = baseSlug;
      let counter = 1;
      
      while (await this.serviceRepository.findOne({ 
        where: { slug, id: Not(id) } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      updateServiceDto.slug = slug;
    }

    Object.assign(service, updateServiceDto);
    const updatedService = await this.serviceRepository.save(service);

    // Update pricing if provided
    if (updateServiceDto.pricing) {
      // Remove existing pricing
      await this.pricingRepository.delete({ serviceId: id });
      
      // Add new pricing
      const pricingEntities = updateServiceDto.pricing.map(pricing =>
        this.pricingRepository.create({
          ...pricing,
          serviceId: id,
        })
      );
      await this.pricingRepository.save(pricingEntities);
    }

    return this.findServiceById(updatedService.id);
  }

  async updateServiceStatus(id: string, status: ServiceStatus): Promise<ServiceListing> {
    const service = await this.findServiceById(id);
    service.status = status;
    return this.serviceRepository.save(service);
  }

  async getFeaturedServices(limit: number = 10): Promise<ServiceListing[]> {
    return this.serviceRepository.find({
      where: {
        isFeatured: true,
        isActive: true,
        status: ServiceStatus.ACTIVE,
      },
      relations: ['vendor', 'category', 'pricing'],
      order: { averageRating: 'DESC', totalBookings: 'DESC' },
      take: limit,
    });
  }

  async getPopularServices(limit: number = 10): Promise<ServiceListing[]> {
    return this.serviceRepository.find({
      where: {
        isActive: true,
        status: ServiceStatus.ACTIVE,
      },
      relations: ['vendor', 'category', 'pricing'],
      order: { totalBookings: 'DESC', viewCount: 'DESC' },
      take: limit,
    });
  }

  async getRecommendedServices(
    userId: string,
    limit: number = 10
  ): Promise<ServiceListing[]> {
    // Simple recommendation based on user's booking history
    // In a real implementation, this would use ML algorithms
    const queryBuilder = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vendor', 'vendor')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('service.pricing', 'pricing')
      .leftJoin('service.bookings', 'booking')
      .where('service.isActive = :isActive', { isActive: true })
      .andWhere('service.status = :status', { status: ServiceStatus.ACTIVE })
      .andWhere('vendor.isActive = :vendorActive', { vendorActive: true })
      .groupBy('service.id')
      .orderBy('service.averageRating', 'DESC')
      .addOrderBy('service.totalBookings', 'DESC')
      .take(limit);

    return queryBuilder.getMany();
  }

  async getServicesByCategory(categoryId: string, limit: number = 20): Promise<ServiceListing[]> {
    return this.serviceRepository.find({
      where: {
        categoryId,
        isActive: true,
        status: ServiceStatus.ACTIVE,
      },
      relations: ['vendor', 'pricing'],
      order: { averageRating: 'DESC', totalBookings: 'DESC' },
      take: limit,
    });
  }

  async getServicesByVendor(vendorId: string): Promise<ServiceListing[]> {
    return this.serviceRepository.find({
      where: { vendorId },
      relations: ['category', 'pricing', 'reviews'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateServiceRating(serviceId: string): Promise<void> {
    const result = await this.serviceRepository
      .createQueryBuilder('service')
      .leftJoin('service.reviews', 'review')
      .select('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .where('service.id = :serviceId', { serviceId })
      .andWhere('review.status = :status', { status: 'approved' })
      .getRawOne();

    await this.serviceRepository.update(serviceId, {
      averageRating: parseFloat(result.avgRating) || 0,
      totalReviews: parseInt(result.totalReviews) || 0,
    });
  }

  async updateServiceStats(serviceId: string): Promise<void> {
    const bookingCount = await this.serviceRepository
      .createQueryBuilder('service')
      .leftJoin('service.bookings', 'booking')
      .select('COUNT(booking.id)', 'totalBookings')
      .where('service.id = :serviceId', { serviceId })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: ['confirmed', 'completed'] 
      })
      .getRawOne();

    await this.serviceRepository.update(serviceId, {
      totalBookings: parseInt(bookingCount.totalBookings) || 0,
    });
  }

  private async updateCategoryServiceCount(categoryId: string): Promise<void> {
    const count = await this.serviceRepository.count({
      where: {
        categoryId,
        isActive: true,
        status: ServiceStatus.ACTIVE,
      },
    });

    await this.categoryRepository.update(categoryId, {
      serviceCount: count,
    });
  }

  async deleteService(id: string): Promise<void> {
    const service = await this.findServiceById(id);
    
    // Soft delete by setting status to archived
    service.status = ServiceStatus.ARCHIVED;
    service.isActive = false;
    await this.serviceRepository.save(service);

    // Update category service count
    await this.updateCategoryServiceCount(service.categoryId);
  }
}
