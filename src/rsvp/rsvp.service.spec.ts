import { getRepositoryToken } from "@nestjs/typeorm";
import { RsvpService } from "./rsvp.service";
import { Test } from "@nestjs/testing";
import { RSVP } from "./rsvp.entity";
import { Repository } from "typeorm";

describe('RSVPService', () => {
  let service: RsvpService;
  let rsvpRepo: Repository<RSVP>;
  let eventRepo: Repository<Event>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RsvpService,
        { provide: getRepositoryToken(RSVP), useClass: Repository },
        { provide: getRepositoryToken(Event), useClass: Repository },
      ],
    }).compile();

    service = module.get(RsvpService);
    rsvpRepo = module.get(getRepositoryToken(RSVP));
    eventRepo = module.get(getRepositoryToken(Event));
  });

  it('should throw if event is not found', async () => {
    jest.spyOn(eventRepo, 'findOne').mockResolvedValue(null);
    await expect(service.rsvpToEvent({ id: 'user1' } as any, 'e1')).rejects.toThrow('Event not found');
  });

  it('should throw if event is not free', async () => {
    jest.spyOn(eventRepo, 'findOne').mockResolvedValue({ isFree: false } as any);
    await expect(service.rsvpToEvent({ id: 'user1' } as any, 'e1')).rejects.toThrow('Event is not free');
  });

  it('should RSVP user successfully', async () => {
    const event = { id: 'e1', isFree: true, rsvps: [], capacity: 2 } as any;
    jest.spyOn(eventRepo, 'findOne').mockResolvedValue(event);
    jest.spyOn(rsvpRepo, 'findOne').mockResolvedValue(null);
    jest.spyOn(rsvpRepo, 'create').mockReturnValue({ user: {}, event } as any);
    jest.spyOn(rsvpRepo, 'save').mockResolvedValue({ id: 'rsvp1' } as any);

    const result = await service.rsvpToEvent({ id: 'user1' } as any, 'e1');
    expect(result.id).toEqual('rsvp1');
  });
});