import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevenueSharingService } from './revenue-sharing.service';
import { RevenueShareRule, RevenueShareType } from './revenue-sharing.entity';

describe('RevenueSharingService', () => {
  let service: RevenueSharingService;
  let repository: Repository<RevenueShareRule>;

  const mockRevenueShareRuleRepository = {
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueSharingService,
        {
          provide: getRepositoryToken(RevenueShareRule),
          useValue: mockRevenueShareRuleRepository,
        },
      ],
    }).compile();

    service = module.get<RevenueSharingService>(RevenueSharingService);
    repository = module.get<Repository<RevenueShareRule>>(
      getRepositoryToken(RevenueShareRule),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('defineRevenueSplit', () => {
    it('should define revenue split rules', async () => {
      const eventId = 'event1';
      const splits = [
        {
          stakeholderId: 'user1',
          shareType: RevenueShareType.PERCENTAGE,
          shareValue: 70,
        },
        {
          stakeholderId: 'user2',
          shareType: RevenueShareType.PERCENTAGE,
          shareValue: 30,
        },
      ];

      mockRevenueShareRuleRepository.update.mockResolvedValue(undefined);
      mockRevenueShareRuleRepository.save.mockResolvedValue(splits);

      const result = await service.defineRevenueSplit(eventId, splits);

      expect(mockRevenueShareRuleRepository.update).toHaveBeenCalledWith(
        { event: { id: eventId } },
        { isActive: false },
      );
      expect(result).toEqual(splits);
    });
  });

  describe('calculateRevenueDistribution', () => {
    it('should calculate revenue distribution for percentage splits', async () => {
      const eventId = 'event1';
      const totalRevenue = 1000;

      const mockRules = [
        {
          id: 'rule1',
          event: { id: eventId },
          stakeholder: { id: 'user1', email: 'user1@example.com' },
          shareType: RevenueShareType.PERCENTAGE,
          shareValue: 70,
          isActive: true,
        },
        {
          id: 'rule2',
          event: { id: eventId },
          stakeholder: { id: 'user2', email: 'user2@example.com' },
          shareType: RevenueShareType.PERCENTAGE,
          shareValue: 30,
          isActive: true,
        },
      ];

      mockRevenueShareRuleRepository.find.mockResolvedValue(mockRules);

      const result = await service.calculateRevenueDistribution(
        eventId,
        totalRevenue,
      );

      expect(result.totalRevenue).toBe(totalRevenue);
      expect(result.distributions).toHaveLength(2);
      expect(result.distributions[0].amount).toBe(700);
      expect(result.distributions[1].amount).toBe(300);
    });
  });
});
