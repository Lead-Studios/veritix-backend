import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketService } from './ticket.service';
import { PromoCode } from '../entities/promo-code.entity';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../../user/entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('TicketService - PromoCode', () => {
  let service: TicketService;
  let promoRepo: Repository<PromoCode>;
  let eventRepo: Repository<Event>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        { provide: getRepositoryToken(PromoCode), useClass: Repository },
        { provide: getRepositoryToken(Event), useClass: Repository },
        { provide: getRepositoryToken(Ticket), useClass: Repository },
        { provide: getRepositoryToken(User), useClass: Repository },
      ],
    }).compile();
    service = module.get<TicketService>(TicketService);
    promoRepo = module.get<Repository<PromoCode>>(
      getRepositoryToken(PromoCode),
    );
    eventRepo = module.get<Repository<Event>>(getRepositoryToken(Event));
  });

  it('should create a promo code', async () => {
    jest.spyOn(eventRepo, 'findOne').mockResolvedValue({ id: 'event1' } as any);
    jest.spyOn(promoRepo, 'findOne').mockResolvedValue(null);
    jest
      .spyOn(promoRepo, 'create')
      .mockReturnValue({ code: 'PROMO', discount: 0.1 } as any);
    jest
      .spyOn(promoRepo, 'save')
      .mockResolvedValue({ code: 'PROMO', discount: 0.1 } as any);
    const result = await service.createPromoCode('event1', {
      code: 'PROMO',
      discount: 0.1,
      maxUses: 10,
      expiresAt: new Date().toISOString(),
    });
    expect(result.code).toBe('PROMO');
  });

  it('should not create duplicate promo code', async () => {
    jest.spyOn(eventRepo, 'findOne').mockResolvedValue({ id: 'event1' } as any);
    jest
      .spyOn(promoRepo, 'findOne')
      .mockResolvedValue({ code: 'PROMO' } as any);
    await expect(
      service.createPromoCode('event1', {
        code: 'PROMO',
        discount: 0.1,
        maxUses: 10,
        expiresAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate a valid promo code', async () => {
    const promo = {
      code: 'PROMO',
      event: { id: 'event1' },
      used: 0,
      maxUses: 10,
      expiresAt: new Date(Date.now() + 10000),
    };
    jest.spyOn(promoRepo, 'findOne').mockResolvedValue(promo as any);
    const result = await service.applyPromoCode('event1', 'PROMO');
    expect(result.valid).toBe(true);
  });

  it('should reject expired promo code', async () => {
    const promo = {
      code: 'PROMO',
      event: { id: 'event1' },
      used: 0,
      maxUses: 10,
      expiresAt: new Date(Date.now() - 10000),
    };
    jest.spyOn(promoRepo, 'findOne').mockResolvedValue(promo as any);
    await expect(service.applyPromoCode('event1', 'PROMO')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject overused promo code', async () => {
    const promo = {
      code: 'PROMO',
      event: { id: 'event1' },
      used: 11,
      maxUses: 10,
      expiresAt: new Date(Date.now() + 10000),
    };
    jest.spyOn(promoRepo, 'findOne').mockResolvedValue(promo as any);
    await expect(service.applyPromoCode('event1', 'PROMO')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject invalid promo code', async () => {
    jest.spyOn(promoRepo, 'findOne').mockResolvedValue(null);
    await expect(service.applyPromoCode('event1', 'INVALID')).rejects.toThrow(
      BadRequestException,
    );
  });
});
