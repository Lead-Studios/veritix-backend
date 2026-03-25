import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketService } from './ticket.service';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketTypeService } from './ticket-type.service';
import { Order } from '../../orders/orders.entity';
import { StellarService } from '../../stellar/stellar.service';
import { QRService } from '../qr.service';
import { AuditLogService } from '../../admin/services/audit-log.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../admin/entities/admin-audit-log.entity';

describe('TicketService', () => {
  let service: TicketService;

  const ticketRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const ticketTypeServiceMock = {
    findByIdEntity: jest.fn(),
    reserveTickets: jest.fn(),
    releaseTickets: jest.fn(),
  };

  const orderRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const stellarServiceMock = {
    sendRefund: jest.fn(),
  };

  const qrServiceMock = {
    generateQRDataURI: jest.fn(),
  };

  const auditLogServiceMock = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        { provide: getRepositoryToken(Ticket), useValue: ticketRepositoryMock },
        { provide: TicketTypeService, useValue: ticketTypeServiceMock },
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: StellarService, useValue: stellarServiceMock },
        { provide: QRService, useValue: qrServiceMock },
        { provide: AuditLogService, useValue: auditLogServiceMock },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('refundTicket', () => {
    it('creates an admin audit log entry for manual refunds', async () => {
      const ticket = {
        id: 'ticket-1',
        status: TicketStatus.ISSUED,
        orderReference: 'order-1',
        ticketTypeId: 'type-1',
        refundedAt: null,
        ticketType: {
          price: 50,
        },
      } as Ticket & { ticketType: { price: number } };

      const refundedOrder = {
        id: 'order-1',
        stellarTxHash: 'stellar-hash',
        buyerStellarAddress: 'GABC123',
        refundTxHash: 'refund-hash',
      };

      ticketRepositoryMock.findOne.mockResolvedValue(ticket);
      orderRepositoryMock.findOne
        .mockResolvedValueOnce(refundedOrder)
        .mockResolvedValueOnce(refundedOrder);
      stellarServiceMock.sendRefund.mockResolvedValue('refund-hash');
      orderRepositoryMock.save.mockResolvedValue(refundedOrder);
      ticketTypeServiceMock.releaseTickets.mockResolvedValue(undefined);
      ticketRepositoryMock.save.mockImplementation(
        async (entity: Ticket) => entity,
      );
      auditLogServiceMock.log.mockResolvedValue(undefined);

      const result = await service.refundTicket('ticket-1', 'admin-1');

      expect(result.status).toBe(TicketStatus.REFUNDED);
      expect(auditLogServiceMock.log).toHaveBeenCalledWith(
        'admin-1',
        AdminAuditAction.MANUAL_REFUND,
        AdminAuditTargetType.TICKET,
        'ticket-1',
        expect.objectContaining({
          orderReference: 'order-1',
          ticketTypeId: 'type-1',
          refundTxHash: 'refund-hash',
        }),
      );
    });
  });
});
