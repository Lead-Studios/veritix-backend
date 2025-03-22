import { Test, TestingModule } from "@nestjs/testing";
import { EventsService } from "./events.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Event } from "./entities/event.entity";
import { Ticket } from "../tickets/entities/ticket.entity";
import { SpecialGuest } from "../special-guests/entities/special-guest.entity";

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe("EventsService", () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(SpecialGuest),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
