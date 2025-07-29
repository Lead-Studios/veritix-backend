import { Test, TestingModule } from '@nestjs/testing';
import { OrganizerService } from '../../src/services/organizer.service';
import { SubscriptionPlan } from '../../src/types/subscription.types';

describe('OrganizerService', () => {
  let service: OrganizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizerService],
    }).compile();

    service = module.get<OrganizerService>(OrganizerService);
  });

  describe('findOrganizerById', () => {
    it('should return organizer when found', async () => {
      const organizer = await service.findOrganizerById('org_1');
      
      expect(organizer).toBeDefined();
      expect(organizer?.id).toBe('org_1');
      expect(organizer?.plan).toBe(SubscriptionPlan.FREE);
    });

    it('should return null when organizer not found', async () => {
      const organizer = await service.findOrganizerById('nonexistent');
      
      expect(organizer).toBeNull();
    });

    it('should return correct organizer data', async () => {
      const organizer = await service.findOrganizerById('org_2');
      
      expect(organizer).toEqual({
        id: 'org_2',
        name: 'Basic Org',
        plan: SubscriptionPlan.BASIC
      });
    });
  });

  describe('getOrganizerSubscriptionPlan', () => {
    it('should return correct subscription plan for existing organizer', async () => {
      const plan = await service.getOrganizerSubscriptionPlan('org_3');
      
      expect(plan).toBe(SubscriptionPlan.PREMIUM);
    });

    it('should return FREE plan for nonexistent organizer', async () => {
      const plan = await service.getOrganizerSubscriptionPlan('nonexistent');
      
      expect(plan).toBe(SubscriptionPlan.FREE);
    });

    it('should return correct plans for all test organizers', async () => {
      const plans = await Promise.all([
        service.getOrganizerSubscriptionPlan('org_1'),
        service.getOrganizerSubscriptionPlan('org_2'),
        service.getOrganizerSubscriptionPlan('org_3'),
        service.getOrganizerSubscriptionPlan('org_4'),
      ]);

      expect(plans).toEqual([
        SubscriptionPlan.FREE,
        SubscriptionPlan.BASIC,
        SubscriptionPlan.PREMIUM,
        SubscriptionPlan.ENTERPRISE,
      ]);
    });
  });
});
