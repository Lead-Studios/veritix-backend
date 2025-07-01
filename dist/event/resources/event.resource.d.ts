import { Event } from '../entities/event.entity';
export declare class EventResource {
    static toResponse(event: Event): {
        id: string;
        name: string;
        images: string[];
    };
    static toArray(events: Event[]): {
        id: string;
        name: string;
        images: string[];
    }[];
}
