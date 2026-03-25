import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventStatus } from '../enums/event-status.enum';

describe('EventsService', () => {
    let service: EventsService;
    let mockQueryBuilder: any;
    let mockRepository: any;

    beforeEach(async () => {
        mockQueryBuilder = {
            andWhere: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        mockRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                {
                    provide: getRepositoryToken(Event),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should apply public default filters when includeAll is false', async () => {
            await service.findAll({});

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.isArchived = :isArchived', { isArchived: false });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.status != :status', { status: EventStatus.CANCELLED });
        });

        it('should ignore public default filters when includeAll is true', async () => {
            await service.findAll({}, true);

            expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('event.isArchived = :isArchived', { isArchived: false });
            expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('event.status != :status', { status: EventStatus.CANCELLED });
        });

        it('should apply search filter (ILIKE) on title and description', async () => {
            await service.findAll({ search: 'concert' });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                '(event.title ILIKE :search OR event.description ILIKE :search)',
                { search: '%concert%' }
            );
        });

        it('should apply status filter', async () => {
            await service.findAll({ status: EventStatus.PUBLISHED });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'event.status = :statusFilter',
                { statusFilter: EventStatus.PUBLISHED }
            );
        });

        it('should apply date range filters', async () => {
            await service.findAll({ dateFrom: '2024-01-01', dateTo: '2024-12-31' });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.eventDate >= :dateFrom', { dateFrom: '2024-01-01' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.eventDate <= :dateTo', { dateTo: '2024-12-31' });
        });

        it('should apply price range filters and join ticketTypes safely', async () => {
            await service.findAll({ minTicketPrice: 10, maxTicketPrice: 50 });

            expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('event.ticketTypes', 'ticketType');
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ticketType.price >= :minTicketPrice', { minTicketPrice: 10 });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ticketType.price <= :maxTicketPrice', { maxTicketPrice: 50 });
        });

        it('should handle pagination boundary conditions', async () => {
            mockQueryBuilder.getManyAndCount.mockResolvedValue([['item1', 'item2'], 50]);

            // Page 2, Limit 10 (skips 10)
            const result = await service.findAll({ page: 2, limit: 10 });

            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(10);
            expect(result.total).toBe(50);
            expect(result.totalPages).toBe(5);
        });
    });
});
