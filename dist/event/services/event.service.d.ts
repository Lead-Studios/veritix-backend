import { Repository } from 'typeorm';
import { CreateEventDto } from '../dtos/event.dto';
import { Event } from '../entities/event.entity';
export declare class EventService {
    private readonly eventRepo;
    constructor(eventRepo: Repository<Event>);
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
