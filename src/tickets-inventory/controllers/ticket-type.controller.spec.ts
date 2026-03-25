import { Test, TestingModule } from '@nestjs/testing';
import { TicketTypeController } from './ticket-type.controller';
import { TicketTypeService } from '../services/ticket-type.service';
import { JwtAuthGuard } from '../../auth/guard/jwt.auth.guard';

// ---------------------------------------------------------------------------
// Stub service — returns minimal shaped objects so we can verify routing
// ---------------------------------------------------------------------------
const mockTicketTypeService = {
  create: jest.fn(),
  findByEvent: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getInventorySummary: jest.fn(),
};

// Override JwtAuthGuard so it never blocks in unit tests
const allowAllGuard = { canActivate: () => true };

describe('TicketTypeController', () => {
  let controller: TicketTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketTypeController],
      providers: [
        { provide: TicketTypeService, useValue: mockTicketTypeService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<TicketTypeController>(TicketTypeController);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // findByEvent — the primary regression test
  // -------------------------------------------------------------------------
  describe('findByEvent', () => {
    it('should pass eventId from route param to the service (not undefined)', async () => {
      const eventId = 'event-uuid-123';
      mockTicketTypeService.findByEvent.mockResolvedValue([]);

      await controller.findByEvent(eventId);

      expect(mockTicketTypeService.findByEvent).toHaveBeenCalledWith(eventId);
      expect(mockTicketTypeService.findByEvent).not.toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should return the service result', async () => {
      const stub = [{ id: 'tt-1', name: 'VIP' }];
      mockTicketTypeService.findByEvent.mockResolvedValue(stub);

      const result = await controller.findByEvent('event-abc');
      expect(result).toBe(stub);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should pass id to the service (not undefined)', async () => {
      mockTicketTypeService.findById.mockResolvedValue({ id: 'tt-99' });

      await controller.findById('event-1', 'tt-99');

      expect(mockTicketTypeService.findById).toHaveBeenCalledWith('tt-99');
      expect(mockTicketTypeService.findById).not.toHaveBeenCalledWith(
        undefined,
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should pass id and dto to the service (id not undefined)', async () => {
      const dto = { name: 'Updated Name' };
      mockTicketTypeService.update.mockResolvedValue({ id: 'tt-5', ...dto });

      await controller.update('event-1', 'tt-5', dto as any);

      expect(mockTicketTypeService.update).toHaveBeenCalledWith('tt-5', dto);
      expect(mockTicketTypeService.update).not.toHaveBeenCalledWith(
        undefined,
        dto,
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should pass id to the service (not undefined)', async () => {
      mockTicketTypeService.delete.mockResolvedValue(undefined);

      await controller.delete('event-1', 'tt-7');

      expect(mockTicketTypeService.delete).toHaveBeenCalledWith('tt-7');
      expect(mockTicketTypeService.delete).not.toHaveBeenCalledWith(undefined);
    });
  });

  // -------------------------------------------------------------------------
  // getInventorySummary
  // -------------------------------------------------------------------------
  describe('getInventorySummary', () => {
    it('should pass eventId to the service (not undefined)', async () => {
      const summary = { total: 100, sold: 40, remaining: 60 };
      mockTicketTypeService.getInventorySummary.mockResolvedValue(summary);

      const result = await controller.getInventorySummary('event-xyz');

      expect(mockTicketTypeService.getInventorySummary).toHaveBeenCalledWith(
        'event-xyz',
      );
      expect(
        mockTicketTypeService.getInventorySummary,
      ).not.toHaveBeenCalledWith(undefined);
      expect(result).toBe(summary);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should pass eventId and dto to the service', async () => {
      const dto = { name: 'General', price: 10, totalQuantity: 200 };
      const created = { id: 'tt-new', eventId: 'event-1', ...dto };
      mockTicketTypeService.create.mockResolvedValue(created);

      const result = await controller.create('event-1', dto as any);

      expect(mockTicketTypeService.create).toHaveBeenCalledWith('event-1', dto);
      expect(result).toBe(created);
    });
  });
});
