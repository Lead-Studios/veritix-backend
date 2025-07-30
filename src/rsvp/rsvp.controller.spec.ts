import { Test } from "@nestjs/testing";
import { RsvpController } from "./rsvp.controller";
import { RsvpService } from "./rsvp.service";

describe('RSVPController', () => {
  let controller: RsvpController;
  let service: RsvpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RsvpController],
      providers: [
        { provide: RsvpService, useValue: { rsvpToEvent: jest.fn(), convertToTicket: jest.fn() } },
      ],
    }).compile();

    controller = module.get(RsvpController);
    service = module.get(RsvpService);
  });

  it('should call service to RSVP', async () => {
    const user = { id: 'u1' };
    const req = { user } as any;
    const eventId = 'e1';

    jest.spyOn(service as any, 'rsvpToEvent').mockResolvedValue({ id: 'r1' } as any);
    const result = await controller.rsvp(eventId, req);
    expect(result).toEqual({ id: 'r1' });
  });

  it('should call service to convert to ticket', async () => {
    const rsvpId = 'r1';
    await controller.convertToTicket(rsvpId);
    expect(service.convertRSVPToTicket).toHaveBeenCalledWith(rsvpId);
  });
});
