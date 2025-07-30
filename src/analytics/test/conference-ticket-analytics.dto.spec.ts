import { validate } from 'class-validator';
import {
  ConferenceTicketAnalyticsFilterDto,
  ConferenceTicketExportDto,
  TimeFilter,
  ExportFormat,
  TicketAnalyticsDataDto,
  ConferenceTicketAnalyticsResponseDto,
  ConferenceTicketTotalResponseDto,
} from '../dto/conference-ticket-analytics.dto';

describe('Conference Ticket Analytics DTOs', () => {
  describe('TimeFilter Enum', () => {
    it('should have correct enum values', () => {
      expect(TimeFilter.HOURLY).toBe('hourly');
      expect(TimeFilter.DAILY).toBe('daily');
      expect(TimeFilter.WEEKLY).toBe('weekly');
      expect(TimeFilter.MONTHLY).toBe('monthly');
      expect(TimeFilter.YEARLY).toBe('yearly');
    });
  });

  describe('ExportFormat Enum', () => {
    it('should have correct enum values', () => {
      expect(ExportFormat.XLS).toBe('xls');
      expect(ExportFormat.CSV).toBe('csv');
    });
  });

  describe('ConferenceTicketAnalyticsFilterDto', () => {
    it('should validate with valid filter', async () => {
      const dto = new ConferenceTicketAnalyticsFilterDto();
      dto.filter = TimeFilter.DAILY;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate without filter (optional)', async () => {
      const dto = new ConferenceTicketAnalyticsFilterDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid filter value', async () => {
      const dto = new ConferenceTicketAnalyticsFilterDto();
      dto.filter = 'invalid' as TimeFilter;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('filter');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should accept all valid filter values', async () => {
      const validFilters = [
        TimeFilter.HOURLY,
        TimeFilter.DAILY,
        TimeFilter.WEEKLY,
        TimeFilter.MONTHLY,
        TimeFilter.YEARLY,
      ];

      for (const filter of validFilters) {
        const dto = new ConferenceTicketAnalyticsFilterDto();
        dto.filter = filter;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('ConferenceTicketExportDto', () => {
    it('should validate with valid format', async () => {
      const dto = new ConferenceTicketExportDto();
      dto.format = ExportFormat.CSV;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing format (required field)', async () => {
      const dto = new ConferenceTicketExportDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('format');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject invalid format value', async () => {
      const dto = new ConferenceTicketExportDto();
      dto.format = 'invalid' as ExportFormat;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('format');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should accept all valid format values', async () => {
      const validFormats = [ExportFormat.CSV, ExportFormat.XLS];

      for (const format of validFormats) {
        const dto = new ConferenceTicketExportDto();
        dto.format = format;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('TicketAnalyticsDataDto', () => {
    it('should create valid instance', () => {
      const dto = new TicketAnalyticsDataDto();
      dto.timestamp = '2024-01-01T10:00:00Z';
      dto.ticketCount = 5;
      dto.conferenceId = '1';

      expect(dto.timestamp).toBe('2024-01-01T10:00:00Z');
      expect(dto.ticketCount).toBe(5);
      expect(dto.conferenceId).toBe('1');
    });

    it('should handle different timestamp formats', () => {
      const dto = new TicketAnalyticsDataDto();
      dto.timestamp = '2024-01-01';
      dto.ticketCount = 3;
      dto.conferenceId = '2';

      expect(dto.timestamp).toBe('2024-01-01');
      expect(dto.ticketCount).toBe(3);
      expect(dto.conferenceId).toBe('2');
    });

    it('should handle zero ticket count', () => {
      const dto = new TicketAnalyticsDataDto();
      dto.timestamp = '2024-01-01T00:00:00Z';
      dto.ticketCount = 0;
      dto.conferenceId = '3';

      expect(dto.ticketCount).toBe(0);
    });

    it('should handle large ticket counts', () => {
      const dto = new TicketAnalyticsDataDto();
      dto.timestamp = '2024-01-01T00:00:00Z';
      dto.ticketCount = 999999;
      dto.conferenceId = '4';

      expect(dto.ticketCount).toBe(999999);
    });
  });

  describe('ConferenceTicketAnalyticsResponseDto', () => {
    it('should create valid instance', () => {
      const dto = new ConferenceTicketAnalyticsResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 10;
      dto.filter = TimeFilter.DAILY;
      dto.data = [
        { timestamp: '2024-01-01', ticketCount: 5, conferenceId: '1' },
        { timestamp: '2024-01-02', ticketCount: 5, conferenceId: '1' },
      ];
      dto.period = {
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-02T00:00:00.000Z',
      };

      expect(dto.conferenceId).toBe('1');
      expect(dto.totalTickets).toBe(10);
      expect(dto.filter).toBe(TimeFilter.DAILY);
      expect(dto.data).toHaveLength(2);
      expect(dto.period.start).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.period.end).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should handle instance without filter', () => {
      const dto = new ConferenceTicketAnalyticsResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 5;
      dto.data = [
        { timestamp: '2024-01-01', ticketCount: 5, conferenceId: '1' },
      ];
      dto.period = {
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-01T23:59:59.999Z',
      };

      expect(dto.filter).toBeUndefined();
      expect(dto.totalTickets).toBe(5);
    });

    it('should handle empty data array', () => {
      const dto = new ConferenceTicketAnalyticsResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 0;
      dto.data = [];
      dto.period = {
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-01T23:59:59.999Z',
      };

      expect(dto.data).toHaveLength(0);
      expect(dto.totalTickets).toBe(0);
    });

    it('should handle all filter types', () => {
      const filters = [
        TimeFilter.HOURLY,
        TimeFilter.DAILY,
        TimeFilter.WEEKLY,
        TimeFilter.MONTHLY,
        TimeFilter.YEARLY,
      ];

      filters.forEach((filter) => {
        const dto = new ConferenceTicketAnalyticsResponseDto();
        dto.conferenceId = '1';
        dto.totalTickets = 1;
        dto.filter = filter;
        dto.data = [
          { timestamp: '2024-01-01', ticketCount: 1, conferenceId: '1' },
        ];
        dto.period = { start: '2024-01-01', end: '2024-01-02' };

        expect(dto.filter).toBe(filter);
      });
    });
  });

  describe('ConferenceTicketTotalResponseDto', () => {
    it('should create valid instance', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 10;
      dto.totalRevenue = 1500.5;
      dto.averageTicketPrice = 150.05;

      expect(dto.conferenceId).toBe('1');
      expect(dto.totalTickets).toBe(10);
      expect(dto.totalRevenue).toBe(1500.5);
      expect(dto.averageTicketPrice).toBe(150.05);
    });

    it('should handle zero values', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 0;
      dto.totalRevenue = 0;
      dto.averageTicketPrice = 0;

      expect(dto.totalTickets).toBe(0);
      expect(dto.totalRevenue).toBe(0);
      expect(dto.averageTicketPrice).toBe(0);
    });

    it('should handle large values', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 999999;
      dto.totalRevenue = 999999.99;
      dto.averageTicketPrice = 999.99;

      expect(dto.totalTickets).toBe(999999);
      expect(dto.totalRevenue).toBe(999999.99);
      expect(dto.averageTicketPrice).toBe(999.99);
    });

    it('should handle decimal precision', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = 3;
      dto.totalRevenue = 333.33;
      dto.averageTicketPrice = 111.11;

      expect(dto.totalRevenue).toBe(333.33);
      expect(dto.averageTicketPrice).toBe(111.11);
    });
  });

  describe('DTO Integration Tests', () => {
    it('should create complete analytics response with all components', () => {
      // Create filter DTO
      const filterDto = new ConferenceTicketAnalyticsFilterDto();
      filterDto.filter = TimeFilter.DAILY;

      // Create export DTO
      const exportDto = new ConferenceTicketExportDto();
      exportDto.format = ExportFormat.CSV;

      // Create analytics data
      const analyticsData = new TicketAnalyticsDataDto();
      analyticsData.timestamp = '2024-01-01T10:00:00Z';
      analyticsData.ticketCount = 5;
      analyticsData.conferenceId = '1';

      // Create response DTO
      const responseDto = new ConferenceTicketAnalyticsResponseDto();
      responseDto.conferenceId = '1';
      responseDto.totalTickets = 5;
      responseDto.filter = filterDto.filter;
      responseDto.data = [analyticsData];
      responseDto.period = {
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-01T23:59:59.999Z',
      };

      // Create total response DTO
      const totalResponseDto = new ConferenceTicketTotalResponseDto();
      totalResponseDto.conferenceId = '1';
      totalResponseDto.totalTickets = 5;
      totalResponseDto.totalRevenue = 750.0;
      totalResponseDto.averageTicketPrice = 150.0;

      // Verify all DTOs are properly structured
      expect(filterDto.filter).toBe(TimeFilter.DAILY);
      expect(exportDto.format).toBe(ExportFormat.CSV);
      expect(analyticsData.ticketCount).toBe(5);
      expect(responseDto.data).toHaveLength(1);
      expect(totalResponseDto.totalRevenue).toBe(750.0);
    });

    it('should handle multiple analytics data points', () => {
      const responseDto = new ConferenceTicketAnalyticsResponseDto();
      responseDto.conferenceId = '1';
      responseDto.totalTickets = 15;
      responseDto.filter = TimeFilter.HOURLY;
      responseDto.data = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          ticketCount: 3,
          conferenceId: '1',
        },
        {
          timestamp: '2024-01-01T11:00:00Z',
          ticketCount: 5,
          conferenceId: '1',
        },
        {
          timestamp: '2024-01-01T12:00:00Z',
          ticketCount: 7,
          conferenceId: '1',
        },
      ];
      responseDto.period = {
        start: '2024-01-01T10:00:00.000Z',
        end: '2024-01-01T12:00:00.000Z',
      };

      expect(responseDto.data).toHaveLength(3);
      expect(responseDto.totalTickets).toBe(15);
      expect(responseDto.data[0].ticketCount).toBe(3);
      expect(responseDto.data[1].ticketCount).toBe(5);
      expect(responseDto.data[2].ticketCount).toBe(7);
    });

    it('should handle different conference IDs', () => {
      const conferenceIds = ['1', '2', '3', 'conference-123', 'conf-abc-456'];

      conferenceIds.forEach((conferenceId) => {
        const totalResponseDto = new ConferenceTicketTotalResponseDto();
        totalResponseDto.conferenceId = conferenceId;
        totalResponseDto.totalTickets = 10;
        totalResponseDto.totalRevenue = 1000;
        totalResponseDto.averageTicketPrice = 100;

        expect(totalResponseDto.conferenceId).toBe(conferenceId);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long conference IDs', () => {
      const longConferenceId =
        'conference-id-that-is-very-long-and-might-exceed-normal-lengths';
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = longConferenceId;
      dto.totalTickets = 1;
      dto.totalRevenue = 100;
      dto.averageTicketPrice = 100;

      expect(dto.conferenceId).toBe(longConferenceId);
    });

    it('should handle very large numbers', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = Number.MAX_SAFE_INTEGER;
      dto.totalRevenue = Number.MAX_SAFE_INTEGER;
      dto.averageTicketPrice = Number.MAX_SAFE_INTEGER;

      expect(dto.totalTickets).toBe(Number.MAX_SAFE_INTEGER);
      expect(dto.totalRevenue).toBe(Number.MAX_SAFE_INTEGER);
      expect(dto.averageTicketPrice).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative numbers (though not recommended)', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '1';
      dto.totalTickets = -5;
      dto.totalRevenue = -1000;
      dto.averageTicketPrice = -200;

      expect(dto.totalTickets).toBe(-5);
      expect(dto.totalRevenue).toBe(-1000);
      expect(dto.averageTicketPrice).toBe(-200);
    });

    it('should handle empty strings', () => {
      const dto = new ConferenceTicketTotalResponseDto();
      dto.conferenceId = '';
      dto.totalTickets = 0;
      dto.totalRevenue = 0;
      dto.averageTicketPrice = 0;

      expect(dto.conferenceId).toBe('');
    });
  });
});
