import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dtos/event.dto';
export declare class EventController {
    private readonly eventService;
    constructor(eventService: EventService);
    create(dto: CreateEventDto): Promise<import("../entities/event.entity").Event>;
    findAll(): Promise<import("../entities/event.entity").Event[]>;
}
