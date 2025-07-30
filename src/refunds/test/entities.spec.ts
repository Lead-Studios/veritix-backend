import { Refund, RefundStatus, RefundReason } from '../entities/refund.entity';

describe('Refund Entities', () => {
  describe('Refund', () => {
    it('should create a refund instance', () => {
      const refund = new Refund();
      refund.ticketId = 'ticket-1';
      refund.eventId = 'event-1';
      refund.organizerId = 'organizer-1';
      refund.purchaserId = 'user-1';
      refund.originalAmount = 100.0;
      refund.refundAmount = 75.0;
      refund.processingFee = 5.0;
      refund.reason = RefundReason.CUSTOMER_REQUEST;
      refund.reasonDescription = 'Customer unable to attend';
      refund.status = RefundStatus.PENDING;
      refund.processedBy = 'organizer-1';
      refund.isPartialRefund = true;
      refund.refundPercentage = 75;

      expect(refund.ticketId).toBe('ticket-1');
      expect(refund.eventId).toBe('event-1');
      expect(refund.organizerId).toBe('organizer-1');
      expect(refund.purchaserId).toBe('user-1');
      expect(refund.originalAmount).toBe(100.0);
      expect(refund.refundAmount).toBe(75.0);
      expect(refund.processingFee).toBe(5.0);
      expect(refund.reason).toBe(RefundReason.CUSTOMER_REQUEST);
      expect(refund.reasonDescription).toBe('Customer unable to attend');
      expect(refund.status).toBe(RefundStatus.PENDING);
      expect(refund.processedBy).toBe('organizer-1');
      expect(refund.isPartialRefund).toBe(true);
      expect(refund.refundPercentage).toBe(75);
    });
  });

  describe('RefundStatus', () => {
    it('should validate refund status enum values', () => {
      expect(RefundStatus.PENDING).toBe('pending');
      expect(RefundStatus.APPROVED).toBe('approved');
      expect(RefundStatus.PROCESSED).toBe('processed');
      expect(RefundStatus.REJECTED).toBe('rejected');
      expect(RefundStatus.FAILED).toBe('failed');
    });
  });

  describe('RefundReason', () => {
    it('should validate refund reason enum values', () => {
      expect(RefundReason.EVENT_CANCELLED).toBe('event_cancelled');
      expect(RefundReason.EVENT_POSTPONED).toBe('event_postponed');
      expect(RefundReason.CUSTOMER_REQUEST).toBe('customer_request');
      expect(RefundReason.DUPLICATE_PURCHASE).toBe('duplicate_purchase');
      expect(RefundReason.TECHNICAL_ISSUE).toBe('technical_issue');
      expect(RefundReason.ORGANIZER_DISCRETION).toBe('organizer_discretion');
      expect(RefundReason.FRAUDULENT_ACTIVITY).toBe('fraudulent_activity');
      expect(RefundReason.OTHER).toBe('other');
    });
  });
});
