import { Test, TestingModule } from "@nestjs/testing";
import { EventsController } from "../../src/events/events.controller";
import { EventsService } from "../../src/events/events.service";

describe("EventsController", () => {
  let controller: EventsController;
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            searchEvents: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
  });

  it("should call searchEvents with correct parameters", async () => {
    const query = "concert";
    const category = "music";
    const location = "New York";
    const page = 1;
    const limit = 10;

    await controller.searchEvents(query, category, location, page, limit);

    expect(service.searchEvents).toHaveBeenCalledWith(
      query,
      category,
      location,
      page,
      limit,
    );
  });
});
