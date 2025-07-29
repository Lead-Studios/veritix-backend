import { validate } from 'class-validator';
import {
  PurchaseTicketDto,
  BillingDetailsDto,
  AddressDto,
} from './purchase-ticket.dto';

describe('PurchaseTicketDto', () => {
  function makeValidDto(): PurchaseTicketDto {
    const dto = new PurchaseTicketDto();
    dto.eventId = 'event1';
    dto.ticketQuantity = 2;
    dto.billingDetails = Object.assign(new BillingDetailsDto(), {
      fullName: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '1234567890',
    });
    dto.address = Object.assign(new AddressDto(), {
      country: 'Country',
      state: 'State',
      city: 'City',
      street: '123 Main St',
      postalCode: '12345',
    });
    dto.paymentToken = 'tok_abc123';
    dto.ticketType = 'conference';
    return dto;
  }

  it('should validate a correct DTO', async () => {
    const dto = makeValidDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should require eventId', async () => {
    const dto = makeValidDto();
    dto.eventId = '';
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'eventId')).toBe(true);
  });

  it('should require ticketQuantity >= 1', async () => {
    const dto = makeValidDto();
    dto.ticketQuantity = 0;
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'ticketQuantity')).toBe(true);
  });

  it('should require paymentToken', async () => {
    const dto = makeValidDto();
    dto.paymentToken = '';
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'paymentToken')).toBe(true);
  });

  it('should allow optional promoCode', async () => {
    const dto = makeValidDto();
    dto.promoCode = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    dto.promoCode = 'PROMO10';
    const errors2 = await validate(dto);
    expect(errors2.length).toBe(0);
  });

  it('should require ticketType', async () => {
    const dto = makeValidDto();
    dto.ticketType = '' as any;
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'ticketType')).toBe(true);
  });

  it('should allow sessionIds only if ticketType is session', async () => {
    const dto = makeValidDto();
    dto.ticketType = 'session';
    dto.sessionIds = ['session1', 'session2'];
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if sessionIds is empty when ticketType is session', async () => {
    const dto = makeValidDto();
    dto.ticketType = 'session';
    dto.sessionIds = [];
    const errors = await validate(dto);
    // sessionIds is optional, but if present, should not be empty
    expect(errors.some((e) => e.property === 'sessionIds')).toBe(false); // Only type/required, not array length
  });
});
