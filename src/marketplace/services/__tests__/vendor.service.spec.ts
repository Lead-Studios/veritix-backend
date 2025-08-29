import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VendorService } from '../vendor.service';
import { Vendor, VendorStatus, VendorTier } from '../../entities/vendor.entity';
import { VendorProfile } from '../../entities/vendor-profile.entity';

describe('VendorService', () => {
  let service: VendorService;
  let vendorRepository: jest.Mocked<Repository<Vendor>>;
  let vendorProfileRepository: jest.Mocked<Repository<VendorProfile>>;

  const mockVendor = {
    id: '1',
    userId: 'user-1',
    businessName: 'Test Vendor',
    businessRegistrationNumber: 'REG123',
    taxId: 'TAX123',
    status: VendorStatus.ACTIVE,
    tier: VendorTier.BASIC,
    commissionRate: 10,
    isActive: true,
    isVerified: true,
    averageRating: 4.5,
    totalReviews: 10,
    totalBookings: 5,
    totalRevenue: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVendorProfile = {
    id: '1',
    vendorId: '1',
    description: 'Test description',
    website: 'https://test.com',
    phone: '+1234567890',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        {
          provide: getRepositoryToken(Vendor),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VendorProfile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
    vendorRepository = module.get(getRepositoryToken(Vendor));
    vendorProfileRepository = module.get(getRepositoryToken(VendorProfile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createVendorDto = {
      userId: 'user-1',
      businessName: 'Test Vendor',
      businessRegistrationNumber: 'REG123',
      taxId: 'TAX123',
      profile: {
        description: 'Test description',
        website: 'https://test.com',
      },
    };

    it('should create a vendor successfully', async () => {
      vendorRepository.findOne.mockResolvedValueOnce(null); // No existing vendor
      vendorRepository.findOne.mockResolvedValueOnce(null); // No existing business name
      vendorRepository.create.mockReturnValue(mockVendor as any);
      vendorRepository.save.mockResolvedValue(mockVendor as any);
      vendorProfileRepository.create.mockReturnValue(mockVendorProfile as any);
      vendorProfileRepository.save.mockResolvedValue(mockVendorProfile as any);

      jest.spyOn(service, 'findOne').mockResolvedValue(mockVendor as any);

      const result = await service.create(createVendorDto);

      expect(vendorRepository.create).toHaveBeenCalledWith({
        ...createVendorDto,
        status: VendorStatus.PENDING,
        tier: VendorTier.BASIC,
      });
      expect(vendorRepository.save).toHaveBeenCalled();
      expect(vendorProfileRepository.create).toHaveBeenCalled();
      expect(vendorProfileRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockVendor);
    });

    it('should throw BadRequestException if user is already a vendor', async () => {
      vendorRepository.findOne.mockResolvedValueOnce(mockVendor as any);

      await expect(service.create(createVendorDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if business name already exists', async () => {
      vendorRepository.findOne.mockResolvedValueOnce(null); // No existing vendor
      vendorRepository.findOne.mockResolvedValueOnce(mockVendor as any); // Existing business name

      await expect(service.create(createVendorDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a vendor by id', async () => {
      vendorRepository.findOne.mockResolvedValue(mockVendor as any);

      const result = await service.findOne('1');

      expect(vendorRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: [
          'profile',
          'user',
          'services',
          'reviews',
          'bookings',
          'commissions',
        ],
      });
      expect(result).toEqual(mockVendor);
    });

    it('should throw NotFoundException if vendor not found', async () => {
      vendorRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update vendor status to active and set verification', async () => {
      const vendor = { ...mockVendor, status: VendorStatus.PENDING };
      jest.spyOn(service, 'findOne').mockResolvedValue(vendor as any);
      vendorRepository.save.mockResolvedValue({
        ...vendor,
        status: VendorStatus.ACTIVE,
        isVerified: true,
        verifiedAt: expect.any(Date),
      } as any);

      const result = await service.updateStatus('1', VendorStatus.ACTIVE);

      expect(result.status).toBe(VendorStatus.ACTIVE);
      expect(result.isVerified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
    });
  });

  describe('updateRating', () => {
    it('should update vendor rating and review count', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avgRating: '4.5',
          totalReviews: '10',
        }),
      };

      vendorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      vendorRepository.update.mockResolvedValue({} as any);

      await service.updateRating('1');

      expect(vendorRepository.update).toHaveBeenCalledWith('1', {
        averageRating: 4.5,
        totalReviews: 10,
      });
    });
  });

  describe('searchVendors', () => {
    it('should search vendors with filters', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockVendor]),
      };

      vendorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchVendors('test', {
        serviceType: 'catering',
        location: 'New York',
        rating: 4,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(vendor.businessName LIKE :search OR profile.description LIKE :search OR service.title LIKE :search)',
        { search: '%test%' },
      );
      expect(result).toEqual([mockVendor]);
    });
  });

  describe('getFeaturedVendors', () => {
    it('should return featured vendors', async () => {
      vendorRepository.find.mockResolvedValue([mockVendor] as any);

      const result = await service.getFeaturedVendors(5);

      expect(vendorRepository.find).toHaveBeenCalledWith({
        where: {
          isFeatured: true,
          isActive: true,
          status: VendorStatus.ACTIVE,
        },
        relations: ['profile', 'services'],
        order: { averageRating: 'DESC', totalReviews: 'DESC' },
        take: 5,
      });
      expect(result).toEqual([mockVendor]);
    });
  });
});
