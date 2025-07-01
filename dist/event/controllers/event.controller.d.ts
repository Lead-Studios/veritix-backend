import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dtos/event.dto';
export declare class EventController {
    private readonly eventService;
    constructor(eventService: EventService);
    create(dto: CreateEventDto): Promise<{
        id: string;
        name: string;
        images: string[];
    }>;
    findAll(): Promise<{
        id: string;
        name: string;
        images: string[];
    }[]>;
}
