import { Test, TestingModule } from "@nestjs/testing";
import { TicketService } from "./tickets.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Ticket } from "./entities/ticket.entity";
import * as QRCode from 'qrcode';
import { ForbiddenException } from '@nestjs/common';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
});

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/mock_qr'),
}));

describe("TicketsService", () => {
  let service: TicketService;
  let ticketRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });


  it('should create a ticket and generate a QR code', async () => {
    const mockUser = { id: 1 };
    const mockDto = {
      name: 'Test Ticket',
      quantity: 1,
      price: 100,
      description: 'Test Description',
      seatNumber: 'A1',
      type: 'VIP',
      eventId: '10',
      deadlineDate: new Date(),
      isReserved: false,
    };
    const savedTicket = { id: 123, ...mockDto };

    const mockConferenceService = {
      findOne: jest.fn().mockResolvedValue({ id: 10, organizerId: 1 }),
    };

    // Inject conferenceService manually if not part of module
    (service as any).conferenceService = mockConferenceService;

    ticketRepo.create.mockReturnValue(mockDto);
    ticketRepo.save.mockResolvedValueOnce(savedTicket); // initial save (to get ID)
    ticketRepo.save.mockResolvedValueOnce({ ...savedTicket, qrCode: 'data:image/mock_qr' }); // update with QR

    const result = await service.createTicket(mockDto, mockUser as any);
    expect(result.qrCode).toContain('data:image/mock_qr');
    expect(QRCode.toDataURL).toHaveBeenCalled();
  });

  it('should throw if user is not organizer of event', async () => {
    const mockUser = { id: 2 };
    const mockDto = {
      name: 'Test Ticket',
      quantity: 1,
      price: 100,
      description: 'Test Description',
      seatNumber: 'A1',
      type: 'VIP',
      eventId: '10',
      deadlineDate: new Date(),
      isReserved: false,
    };

    const mockConferenceService = {
      findOne: jest.fn().mockResolvedValue({ id: 10, organizerId: 1 }),
    };
    (service as any).conferenceService = mockConferenceService;

    await expect(service.createTicket(mockDto, mockUser as any)).rejects.toThrow(
      ForbiddenException,
    );
  });
  
});
