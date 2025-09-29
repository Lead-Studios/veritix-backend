import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketService } from './ticket.service';
import { Ticket } from './ticket.entity';
import { User } from '../user/user.entity';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TicketService', () => {
  let service: TicketService;
  let ticketRepository: Repository<Ticket>;
  let userRepository: Repository<User>;

  const mockTicket = {
    id: 'ticket-1',
    ownerId: 'user-1',
    owner: { id: 'user-1' },
    event: { id: 'event-1' },
    isTransferable: true,
    maxTransfers: 2,
    transfersCount: 0,
  };

  const mockNewOwner = {
    id: 'user-2',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    ticketRepository = module.get<Repository<Ticket>>(
      getRepositoryToken(Ticket),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transferTicket', () => {
    const dto: TransferTicketDto = { newOwnerId: 'user-2' };

    it('should transfer ticket successfully', async () => {
      const findOneSpy = jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(mockTicket as Ticket);
      const userFindOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockNewOwner as User);
      const saveSpy = jest.spyOn(ticketRepository, 'save').mockResolvedValue({
        ...mockTicket,
        owner: mockNewOwner,
        ownerId: 'user-2',
        transfersCount: 1,
      } as Ticket);

      const result = await service.transferTicket('ticket-1', dto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        relations: ['owner', 'event'],
      });
      expect(userFindOneSpy).toHaveBeenCalledWith({
        where: { id: 'user-2' },
      });
      expect(saveSpy).toHaveBeenCalledWith({
        ...mockTicket,
        owner: mockNewOwner,
        ownerId: 'user-2',
        transfersCount: 1,
      });
      expect(result.transfersCount).toBe(1);
      expect(result.ownerId).toBe('user-2');
    });

    it('should throw NotFoundException if ticket not found', async () => {
      const findOneSpy = jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(service.transferTicket('ticket-1', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        relations: ['owner', 'event'],
      });
    });

    it('should throw NotFoundException if new owner not found', async () => {
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(mockTicket as Ticket);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.transferTicket('ticket-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if ticket is non-transferable', async () => {
      const nonTransferableTicket = { ...mockTicket, isTransferable: false };
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(nonTransferableTicket as Ticket);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockNewOwner as User);

      await expect(service.transferTicket('ticket-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if max transfers exceeded', async () => {
      const maxExceededTicket = { ...mockTicket, transfersCount: 2 };
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(maxExceededTicket as Ticket);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockNewOwner as User);

      await expect(service.transferTicket('ticket-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
