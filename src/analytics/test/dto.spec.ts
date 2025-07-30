import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AnalyticsFilterDto } from '../dto/analytics-filter.dto';

describe('DTOs', () => {
  describe('AnalyticsFilterDto', () => {
    it('should validate valid filter data', async () => {
      const filterData = {
        conferenceId: '550e8400-e29b-41d4-a716-446655440001',
        startDate: '2024-03-15',
        endDate: '2024-03-17',
        track: 'Tech',
        speaker: 'John Doe',
        exportToCsv: 'true',
        exportToPdf: 'false',
      };

      const dto = plainToClass(AnalyticsFilterDto, filterData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.conferenceId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(dto.startDate).toBe('2024-03-15');
      expect(dto.endDate).toBe('2024-03-17');
      expect(dto.track).toBe('Tech');
      expect(dto.speaker).toBe('John Doe');
      expect(dto.exportToCsv).toBe(true);
      expect(dto.exportToPdf).toBe(false);
    });

    it('should validate empty filter data', async () => {
      const filterData = {};

      const dto = plainToClass(AnalyticsFilterDto, filterData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.conferenceId).toBeUndefined();
      expect(dto.startDate).toBeUndefined();
      expect(dto.endDate).toBeUndefined();
      expect(dto.track).toBeUndefined();
      expect(dto.speaker).toBeUndefined();
      expect(dto.exportToCsv).toBeUndefined();
      expect(dto.exportToPdf).toBeUndefined();
    });

    it('should reject invalid UUID for conferenceId', async () => {
      const filterData = {
        conferenceId: 'invalid-uuid',
      };

      const dto = plainToClass(AnalyticsFilterDto, filterData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('conferenceId');
    });

    it('should reject invalid date format', async () => {
      const filterData = {
        startDate: 'invalid-date',
      };

      const dto = plainToClass(AnalyticsFilterDto, filterData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('startDate');
    });
  });
});
