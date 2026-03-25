import { Event } from '../entities/event.entity';

export class PaginatedEventsResponseDto {
    data: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
