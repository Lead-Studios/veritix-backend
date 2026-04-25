import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VerificationService } from './verification.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { VerificationStatus } from './enums/verification-status.enum';
import { EventStatus } from '../events/enums/event-status.enum';

describe('VerificationService', () => {
  let service: VerificationService;
  let ticketRepository: any;
  let eventRepository: any;
  let verificationLogRepository: any;

  const mockTicketId = 'ticket-123';
  const mockVerifiedBy = 'user-456';

  const mockEvent = {
    id: 'event-123',
    status: EventStatus.PUBLISHED,
    eventDate: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    eventClosingDate: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
  };

  const mockTicket = {
    id: mockTicketId,
    status: 'ACTIVE',
    event: mockEvent,
  };

  beforeEach(async () => {
    ticketRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    eventRepository = {
      findOne: jest.fn(),
    };

    verificationLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: ticketRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: eventRepository,
        },
        {
          provide: getRepositoryToken(VerificationLog),
          useValue: verificationLogRepository,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  it('should return INVALID when ticket not found', async () => {
    ticketRepository.findOne.mockResolvedValue(null);

    const result = await service.verifyTicket(mockTicketId, false, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.INVALID);
    expect(ticketRepository.findOne).toHaveBeenCalledWith({
      where: { id: mockTicketId },
      relations: ['event'],
    });
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.INVALID,
      markAsUsed: false,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });

  it('should return CANCELLED when event is cancelled', async () => {
    const cancelledEvent = { ...mockEvent, status: EventStatus.CANCELLED };
    const ticketWithCancelledEvent = { ...mockTicket, event: cancelledEvent };
    ticketRepository.findOne.mockResolvedValue(ticketWithCancelledEvent);

    const result = await service.verifyTicket(mockTicketId, false, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.CANCELLED);
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.CANCELLED,
      markAsUsed: false,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });

  it('should return EVENT_NOT_STARTED when event has not started', async () => {
    const futureEvent = { ...mockEvent, eventDate: new Date(Date.now() + 1000 * 60 * 60) }; // 1 hour from now
    const ticketWithFutureEvent = { ...mockTicket, event: futureEvent };
    ticketRepository.findOne.mockResolvedValue(ticketWithFutureEvent);

    const result = await service.verifyTicket(mockTicketId, false, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.EVENT_NOT_STARTED);
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.EVENT_NOT_STARTED,
      markAsUsed: false,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });

  it('should return EVENT_ENDED when event has ended', async () => {
    const pastEvent = { ...mockEvent, eventClosingDate: new Date(Date.now() - 1000 * 60 * 60) }; // 1 hour ago
    const ticketWithPastEvent = { ...mockTicket, event: pastEvent };
    ticketRepository.findOne.mockResolvedValue(ticketWithPastEvent);

    const result = await service.verifyTicket(mockTicketId, false, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.EVENT_ENDED);
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.EVENT_ENDED,
      markAsUsed: false,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });

  it('should return ALREADY_USED when ticket is already used', async () => {
    const usedTicket = { ...mockTicket, status: 'USED' };
    ticketRepository.findOne.mockResolvedValue(usedTicket);

    const result = await service.verifyTicket(mockTicketId, false, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.ALREADY_USED);
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.ALREADY_USED,
      markAsUsed: false,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });

  it('should return VALID when ticket is valid and markAsUsed is false', async () => {
    ticketRepository.findOne.mockResolvedValue(mockTicket);

    const result = await service.verifyTicket(mockTicketId, false, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.VALID);
    expect(ticketRepository.update).not.toHaveBeenCalled();
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.VALID,
      markAsUsed: false,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });

  it('should return VALID and update ticket status when markAsUsed is true', async () => {
    ticketRepository.findOne.mockResolvedValue(mockTicket);

    const result = await service.verifyTicket(mockTicketId, true, mockVerifiedBy);

    expect(result).toBe(VerificationStatus.VALID);
    expect(ticketRepository.update).toHaveBeenCalledWith(mockTicketId, { status: 'USED' });
    expect(verificationLogRepository.create).toHaveBeenCalledWith({
      ticketId: mockTicketId,
      status: VerificationStatus.VALID,
      markAsUsed: true,
      verifiedBy: mockVerifiedBy,
    });
    expect(verificationLogRepository.save).toHaveBeenCalled();
  });
});