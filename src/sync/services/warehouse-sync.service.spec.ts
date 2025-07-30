import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseSyncService } from './warehouse-sync.service';
import { TicketSalesRecord } from '../schemas/ticket-sales.schema';

// Mock external dependencies
jest.mock('@google-cloud/bigquery');
jest.mock('pg');

describe('WarehouseSyncService', () => {
  let service: WarehouseSyncService;
  let mockBigQuery: any;
  let mockRedshiftClient: any;

  beforeEach(async () => {
    // Setup BigQuery mocks
    const mockTable = {
      insert: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue([true]),
    };

    const mockDataset = {
      table: jest.fn().mockReturnValue(mockTable),
      createTable: jest.fn().mockResolvedValue(undefined),
    };

    mockBigQuery = {
      dataset: jest.fn().mockReturnValue(mockDataset),
    };

    // Setup Redshift mocks
    mockRedshiftClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };

    // Mock the constructors
    const { BigQuery } = require('@google-cloud/bigquery');
    const { Client } = require('pg');

    BigQuery.mockImplementation(() => mockBigQuery);
    Client.mockImplementation(() => mockRedshiftClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [WarehouseSyncService],
    }).compile();

    service = module.get<WarehouseSyncService>(WarehouseSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncToBigQuery', () => {
    it('should sync records to BigQuery successfully', async () => {
      const mockRecords: TicketSalesRecord[] = [
        {
          ticketId: 'ticket-1',
          eventId: 'event-1',
          eventName: 'Test Event',
          eventDate: new Date(),
          customerId: 'customer-1',
          customerEmail: 'test@example.com',
          customerName: 'Test Customer',
          ticketType: 'General',
          quantity: 2,
          unitPrice: 50,
          totalAmount: 100,
          currency: 'USD',
          purchaseDate: new Date(),
          paymentMethod: 'credit_card',
          paymentStatus: 'completed',
          refunded: false,
          venue: 'Test Venue',
          venueCity: 'Test City',
          venueCountry: 'Test Country',
          salesChannel: 'online',
          discountAmount: 0,
          fees: 5,
          taxes: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const jobId = 'test-job-id';

      await service.syncToBigQuery(mockRecords, jobId);

      expect(mockBigQuery.dataset).toHaveBeenCalledWith('ticket_sales');
      const mockDataset = mockBigQuery.dataset.mock.results[0].value;
      expect(mockDataset.table).toHaveBeenCalledWith('sales_data');

      const mockTable = mockDataset.table.mock.results[0].value;
      expect(mockTable.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          ...mockRecords[0],
          sync_job_id: jobId,
          synced_at: expect.any(String),
        }),
      ]);
    });

    it('should handle BigQuery errors', async () => {
      const mockRecords: TicketSalesRecord[] = [];
      const error = new Error('BigQuery connection failed');

      const mockTable = {
        insert: jest.fn().mockRejectedValue(error),
        exists: jest.fn().mockResolvedValue([true]),
      };

      mockBigQuery.dataset.mockReturnValue({
        table: jest.fn().mockReturnValue(mockTable),
      });

      await expect(
        service.syncToBigQuery(mockRecords, 'job-id'),
      ).rejects.toThrow('BigQuery connection failed');
    });
  });

  describe('syncToRedshift', () => {
    it('should sync records to Redshift successfully', async () => {
      const mockRecords: TicketSalesRecord[] = [
        {
          ticketId: 'ticket-1',
          eventId: 'event-1',
          eventName: 'Test Event',
          eventDate: new Date(),
          customerId: 'customer-1',
          customerEmail: 'test@example.com',
          customerName: 'Test Customer',
          ticketType: 'General',
          quantity: 2,
          unitPrice: 50,
          totalAmount: 100,
          currency: 'USD',
          purchaseDate: new Date(),
          paymentMethod: 'credit_card',
          paymentStatus: 'completed',
          refunded: false,
          venue: 'Test Venue',
          venueCity: 'Test City',
          venueCountry: 'Test Country',
          salesChannel: 'online',
          discountAmount: 0,
          fees: 5,
          taxes: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const jobId = 'test_job_id';

      await service.syncToRedshift(mockRecords, jobId);

      expect(mockRedshiftClient.connect).toHaveBeenCalled();
      expect(mockRedshiftClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sales_data'),
      );
      expect(mockRedshiftClient.query).toHaveBeenCalledWith(
        expect.stringContaining(`CREATE TEMP TABLE temp_sales_${jobId}`),
      );
      expect(mockRedshiftClient.end).toHaveBeenCalled();
    });

    it('should handle Redshift errors and cleanup', async () => {
      const mockRecords: TicketSalesRecord[] = [];
      const error = new Error('Redshift connection failed');

      mockRedshiftClient.connect.mockRejectedValue(error);

      await expect(
        service.syncToRedshift(mockRecords, 'job-id'),
      ).rejects.toThrow('Redshift connection failed');

      expect(mockRedshiftClient.end).toHaveBeenCalled();
    });
  });
});
