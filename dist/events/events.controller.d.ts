import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    create(createEventDto: CreateEventDto, req: any): Promise<import("./event.entity").Event>;
    findAll(): Promise<import("./event.entity").Event[]>;
    findOne(id: string): Promise<import("./event.entity").Event>;
    update(id: string, updateEventDto: UpdateEventDto): Promise<import("./event.entity").Event>;
    remove(id: string): Promise<void>;
}
