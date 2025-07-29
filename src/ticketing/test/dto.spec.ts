import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PurchaseTicketDto } from '../dto/purchase-ticket.dto';
import { ScanTicketDto } from '../dto/scan-ticket.dto';

describe('DTOs', () => {
  describe('PurchaseTicketDto', () => {
    it('should validate valid purchase data', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 2,
      };

      const dto = plainToClass(PurchaseTicketDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.eventId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(dto.purchaserId).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(dto.purchaserName).toBe('John Doe');
      expect(dto.purchaserEmail).toBe('john@example.com');
      expect(dto.quantity).toBe(2);
    });

    it('should set default quantity to 1', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
      };

      const dto = plainToClass(PurchaseTicketDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.quantity).toBe(1);
    });

    it('should reject invalid UUID for eventId', async () => {
      const purchaseData = {
        eventId: 'invalid-uuid',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
      };

      const dto = plainToClass(PurchaseTicketDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventId');
    });

    it('should reject invalid email', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'invalid-email',
      };

      const dto = plainToClass(PurchaseTicketDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('purchaserEmail');
    });

    it('should reject quantity less than 1', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 0,
      };

      const dto = plainToClass(PurchaseTicketDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('quantity');
    });
  });

  describe('ScanTicketDto', () => {
    it('should validate valid scan data', async () => {
      const scanData = {
        qrCodeData: 'valid-qr-data',
        scannedBy: '550e8400-e29b-41d4-a716-446655440001',
        eventId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const dto = plainToClass(ScanTicketDto, scanData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.qrCodeData).toBe('valid-qr-data');
      expect(dto.scannedBy).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(dto.eventId).toBe('550e8400-e29b-41d4-a716-446655440002');
    });

    it('should validate without optional eventId', async () => {
      const scanData = {
        qrCodeData: 'valid-qr-data',
        scannedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const dto = plainToClass(ScanTicketDto, scanData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.eventId).toBeUndefined();
    });

    it('should reject empty qrCodeData', async () => {
      const scanData = {
        qrCodeData: '',
        scannedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const dto = plainToClass(ScanTicketDto, scanData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('qrCodeData');
    });

    it('should reject invalid UUID for scannedBy', async () => {
      const scanData = {
        qrCodeData: 'valid-qr-data',
        scannedBy: 'invalid-uuid',
      };

      const dto = plainToClass(ScanTicketDto, scanData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('scannedBy');
    });
  });
});
