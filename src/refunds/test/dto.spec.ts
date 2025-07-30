import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { UpdateRefundDto } from '../dto/update-refund.dto';
import { BulkRefundDto } from '../dto/bulk-refund.dto';
import { RefundReason, RefundStatus } from '../entities/refund.entity';

describe('Refund DTOs', () => {
  describe('CreateRefundDto', () => {
    it('should validate valid refund creation data', async () => {
      const refundData = {
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        processedBy: '550e8400-e29b-41d4-a716-446655440002',
        refundAmount: 75.5,
        processingFee: 2.5,
        reason: RefundReason.CUSTOMER_REQUEST,
        reasonDescription: 'Customer unable to attend due to illness',
        internalNotes: 'Approved due to medical emergency',
        customerMessage: 'Your refund has been processed',
        autoProcess: true,
        refundPercentage: 75,
      };

      const dto = plainToClass(CreateRefundDto, refundData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.ticketId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(dto.processedBy).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(dto.refundAmount).toBe(75.5);
      expect(dto.processingFee).toBe(2.5);
      expect(dto.reason).toBe(RefundReason.CUSTOMER_REQUEST);
      expect(dto.reasonDescription).toBe(
        'Customer unable to attend due to illness',
      );
      expect(dto.autoProcess).toBe(true);
      expect(dto.refundPercentage).toBe(75);
    });

    it('should set default autoProcess to false', async () => {
      const refundData = {
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        processedBy: '550e8400-e29b-41d4-a716-446655440002',
        reason: RefundReason.CUSTOMER_REQUEST,
      };

      const dto = plainToClass(CreateRefundDto, refundData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.autoProcess).toBe(false);
    });

    it('should reject invalid UUID for ticketId', async () => {
      const refundData = {
        ticketId: 'invalid-uuid',
        processedBy: '550e8400-e29b-41d4-a716-446655440002',
        reason: RefundReason.CUSTOMER_REQUEST,
      };

      const dto = plainToClass(CreateRefundDto, refundData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ticketId');
    });

    it('should reject negative refund amount', async () => {
      const refundData = {
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        processedBy: '550e8400-e29b-41d4-a716-446655440002',
        refundAmount: -10,
        reason: RefundReason.CUSTOMER_REQUEST,
      };

      const dto = plainToClass(CreateRefundDto, refundData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('refundAmount');
    });

    it('should reject refund percentage over 100', async () => {
      const refundData = {
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        processedBy: '550e8400-e29b-41d4-a716-446655440002',
        refundPercentage: 150,
        reason: RefundReason.CUSTOMER_REQUEST,
      };

      const dto = plainToClass(CreateRefundDto, refundData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('refundPercentage');
    });

    it('should reject invalid refund reason', async () => {
      const refundData = {
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        processedBy: '550e8400-e29b-41d4-a716-446655440002',
        reason: 'invalid_reason',
      };

      const dto = plainToClass(CreateRefundDto, refundData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('reason');
    });
  });

  describe('UpdateRefundDto', () => {
    it('should validate valid update data', async () => {
      const updateData = {
        status: RefundStatus.PROCESSED,
        refundTransactionId: 'txn-123456',
        internalNotes: 'Processed successfully',
        customerMessage: 'Your refund has been completed',
        processingFee: 1.5,
      };

      const dto = plainToClass(UpdateRefundDto, updateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.status).toBe(RefundStatus.PROCESSED);
      expect(dto.refundTransactionId).toBe('txn-123456');
      expect(dto.processingFee).toBe(1.5);
    });

    it('should allow empty update data', async () => {
      const updateData = {};

      const dto = plainToClass(UpdateRefundDto, updateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid status', async () => {
      const updateData = {
        status: 'invalid_status',
      };

      const dto = plainToClass(UpdateRefundDto, updateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('status');
    });

    it('should reject negative processing fee', async () => {
      const updateData = {
        processingFee: -5,
      };

      const dto = plainToClass(UpdateRefundDto, updateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('processingFee');
    });
  });

  describe('BulkRefundDto', () => {
    it('should validate valid bulk refund data', async () => {
      const bulkData = {
        ticketIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
        ],
        processedBy: '550e8400-e29b-41d4-a716-446655440000',
        refundPercentage: 100,
        processingFee: 0,
        reason: RefundReason.EVENT_CANCELLED,
        reasonDescription: 'Event cancelled due to weather',
        internalNotes: 'Mass refund for cancelled event',
        customerMessage: 'Event cancelled, full refund issued',
        autoProcess: true,
      };

      const dto = plainToClass(BulkRefundDto, bulkData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.ticketIds).toHaveLength(3);
      expect(dto.refundPercentage).toBe(100);
      expect(dto.autoProcess).toBe(true);
    });

    it('should set default autoProcess to false', async () => {
      const bulkData = {
        ticketIds: ['550e8400-e29b-41d4-a716-446655440001'],
        processedBy: '550e8400-e29b-41d4-a716-446655440000',
        reason: RefundReason.EVENT_CANCELLED,
      };

      const dto = plainToClass(BulkRefundDto, bulkData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.autoProcess).toBe(false);
    });

    it('should reject empty ticket IDs array', async () => {
      const bulkData = {
        ticketIds: [],
        processedBy: '550e8400-e29b-41d4-a716-446655440000',
        reason: RefundReason.EVENT_CANCELLED,
      };

      const dto = plainToClass(BulkRefundDto, bulkData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ticketIds');
    });

    it('should reject invalid UUIDs in ticket IDs', async () => {
      const bulkData = {
        ticketIds: [
          'valid-550e8400-e29b-41d4-a716-446655440001',
          'invalid-uuid',
        ],
        processedBy: '550e8400-e29b-41d4-a716-446655440000',
        reason: RefundReason.EVENT_CANCELLED,
      };

      const dto = plainToClass(BulkRefundDto, bulkData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ticketIds');
    });

    it('should reject refund percentage over 100', async () => {
      const bulkData = {
        ticketIds: ['550e8400-e29b-41d4-a716-446655440001'],
        processedBy: '550e8400-e29b-41d4-a716-446655440000',
        refundPercentage: 150,
        reason: RefundReason.EVENT_CANCELLED,
      };

      const dto = plainToClass(BulkRefundDto, bulkData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('refundPercentage');
    });
  });
});
