import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCrudService } from './ticket-crud.service';
import { Ticket, TicketStatus } from './ticket.entity';
import { Event } from '../modules/event/event.entity';
import { User } from '../user/user.entity';
import { CreateTicketDto, CreateTicketStatusInput } from './dto/create-ticket.dto';
import { UpdateTicketDto, UpdateTicketStatusInput } from './dto/update-ticket.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';


describe('TicketCrudService', () => {
  let service: TicketCrudService;
  let ticketRepo: jest.Mocked<Repository<Ticket>>;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketCrudService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<TicketCrudService>(TicketCrudService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
    eventRepo = module.get(getRepositoryToken(Event));
    userRepo = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    const dto: CreateTicketDto = {
      eventId: 'event-1',
      ownerId: 'user-1',
      status: CreateTicketStatusInput.VALID,
    };

    it('creates a ticket when event and owner exist', async () => {
      const event: Partial<Event> = { id: 'event-1', ticketPrice: 50 } as any;
      const owner: Partial<User> = { id: 'user-1' } as any;
      (eventRepo.findOne as jest.Mock).mockResolvedValue(event as Event);
      (userRepo.findOne as jest.Mock).mockResolvedValue(owner as User);

      const created: Partial<Ticket> = {
        id: 'ticket-1',
        status: TicketStatus.ACTIVE,
        event: event as Event,
        originalOwner: owner as User,
        currentOwner: owner as User,
      } as any;

      (ticketRepo.create as jest.Mock).mockReturnValue(created);
      (ticketRepo.save as jest.Mock).mockResolvedValue(created as Ticket);

      const result = await service.create(dto);

      expect(eventRepo.findOne).toHaveBeenCalledWith({ where: { id: 'event-1' } });
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(ticketRepo.create).toHaveBeenCalled();
      expect(ticketRepo.save).toHaveBeenCalledWith(created);
      expect(result.status).toBe(TicketStatus.ACTIVE);
    });

    it('throws when event does not exist', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws when owner does not exist', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue({ id: 'event-1', ticketPrice: 10 } as Event);
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('returns the ticket when found', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue({ id: 't1' } as Ticket);
      const res = await service.findOne('t1');
      expect(ticketRepo.findOne).toHaveBeenCalledWith({
        where: { id: 't1' },
        relations: ['event', 'currentOwner', 'originalOwner'],
      });
      expect(res.id).toBe('t1');
    });

    it('throws NotFound when missing', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates status from ACTIVE to USED', async () => {
      const existing: Ticket = { id: 't1', status: TicketStatus.ACTIVE } as any;
      jest.spyOn(service, 'findOne').mockResolvedValue(existing);

      (ticketRepo.save as jest.Mock).mockImplementation(async (t: Ticket) => t);

      const dto: UpdateTicketDto = { status: UpdateTicketStatusInput.USED };
      const res = await service.update('t1', dto);
      expect(res.status).toBe(TicketStatus.USED);
    });

    it('prevents reverting USED back to ACTIVE', async () => {
      const existing: Ticket = { id: 't1', status: TicketStatus.USED } as any;
      jest.spyOn(service, 'findOne').mockResolvedValue(existing);

      const dto: UpdateTicketDto = { status: UpdateTicketStatusInput.VALID };
      await expect(service.update('t1', dto)).rejects.toThrow(BadRequestException);
    });

    it('prevents setting TRANSFERRED via PATCH', async () => {
      const existing: Ticket = { id: 't1', status: TicketStatus.ACTIVE } as any;
      jest.spyOn(service, 'findOne').mockResolvedValue(existing);

      const dto: UpdateTicketDto = { status: UpdateTicketStatusInput.TRANSFERRED };
      await expect(service.update('t1', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
