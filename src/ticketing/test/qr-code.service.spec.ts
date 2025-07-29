import { Test, type TestingModule } from '@nestjs/testing';
import { QrCodeService } from '../services/qr-code.service';
import { jest } from '@jest/globals';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrCodeService],
    }).compile();

    service = module.get<QrCodeService>(QrCodeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateQrCode', () => {
    it('should generate QR code with valid data', async () => {
      const ticketId = 'ticket-123';
      const eventId = 'event-456';
      const purchaserId = 'user-789';

      const result = await service.generateQrCode(
        ticketId,
        eventId,
        purchaserId,
      );

      expect(result).toBeDefined();
      expect(result.qrCodeData).toBeDefined();
      expect(result.qrCodeImage).toBeDefined();
      expect(result.secureHash).toBeDefined();

      // Verify QR code data contains expected fields
      const qrData = JSON.parse(result.qrCodeData);
      expect(qrData.ticketId).toBe(ticketId);
      expect(qrData.eventId).toBe(eventId);
      expect(qrData.purchaserId).toBe(purchaserId);
      expect(qrData.timestamp).toBeDefined();
      expect(qrData.hash).toBeDefined();

      // Verify QR code image is base64 data URL
      expect(result.qrCodeImage).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate different QR codes for different inputs', async () => {
      const result1 = await service.generateQrCode(
        'ticket-1',
        'event-1',
        'user-1',
      );
      const result2 = await service.generateQrCode(
        'ticket-2',
        'event-2',
        'user-2',
      );

      expect(result1.qrCodeData).not.toBe(result2.qrCodeData);
      expect(result1.qrCodeImage).not.toBe(result2.qrCodeImage);
      expect(result1.secureHash).not.toBe(result2.secureHash);
    });
  });

  describe('verifyQrCode', () => {
    it('should verify valid QR code', async () => {
      const ticketId = 'ticket-123';
      const eventId = 'event-456';
      const purchaserId = 'user-789';

      const generated = await service.generateQrCode(
        ticketId,
        eventId,
        purchaserId,
      );
      const verification = service.verifyQrCode(generated.qrCodeData);

      expect(verification.isValid).toBe(true);
      expect(verification.payload).toBeDefined();
      expect(verification.payload.ticketId).toBe(ticketId);
      expect(verification.payload.eventId).toBe(eventId);
      expect(verification.payload.purchaserId).toBe(purchaserId);
      expect(verification.error).toBeUndefined();
    });

    it('should reject invalid JSON', () => {
      const verification = service.verifyQrCode('invalid json');

      expect(verification.isValid).toBe(false);
      expect(verification.error).toBe('Invalid QR code data');
      expect(verification.payload).toBeUndefined();
    });

    it('should reject QR code with missing fields', () => {
      const invalidData = JSON.stringify({
        ticketId: 'ticket-123',
        // Missing other required fields
      });

      const verification = service.verifyQrCode(invalidData);

      expect(verification.isValid).toBe(false);
      expect(verification.error).toBe('Invalid QR code format');
    });

    it('should reject QR code with tampered hash', async () => {
      const generated = await service.generateQrCode(
        'ticket-123',
        'event-456',
        'user-789',
      );
      const qrData = JSON.parse(generated.qrCodeData);

      // Tamper with the hash
      qrData.hash = 'tampered-hash';
      const tamperedQrCode = JSON.stringify(qrData);

      const verification = service.verifyQrCode(tamperedQrCode);

      expect(verification.isValid).toBe(false);
      expect(verification.error).toBe('QR code has been tampered with');
    });

    it('should reject expired QR code', () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const expiredData = JSON.stringify({
        ticketId: 'ticket-123',
        eventId: 'event-456',
        purchaserId: 'user-789',
        timestamp: oldTimestamp,
        hash: 'some-hash',
      });

      const verification = service.verifyQrCode(expiredData);

      expect(verification.isValid).toBe(false);
      expect(verification.error).toBe('QR code has expired');
    });
  });

  describe('generateTicketNumber', () => {
    it('should generate unique ticket numbers', () => {
      const eventId = 'event-123';

      const ticket1 = service.generateTicketNumber(eventId);
      const ticket2 = service.generateTicketNumber(eventId);

      expect(ticket1).toBeDefined();
      expect(ticket2).toBeDefined();
      expect(ticket1).not.toBe(ticket2);

      // Should contain event prefix
      expect(ticket1).toContain(eventId.substring(0, 8).toUpperCase());
      expect(ticket2).toContain(eventId.substring(0, 8).toUpperCase());
    });

    it('should generate ticket numbers with correct format', () => {
      const eventId = 'event-123-456';
      const ticketNumber = service.generateTicketNumber(eventId);

      // Should match pattern: EVENTPRE-timestamp-random
      const parts = ticketNumber.split('-');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('EVENT-12');
      expect(parts[1]).toMatch(/^[A-Z0-9]+$/);
      expect(parts[2]).toMatch(/^[A-Z0-9]+$/);
    });
  });
});
