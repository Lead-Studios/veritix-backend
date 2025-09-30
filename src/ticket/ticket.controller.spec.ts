import { Test, TestingModule } from '@nestjs/testing';
import { TicketController } from './ticket.controller';
import { TicketCrudService } from './ticket-crud.service';
import { TicketQrService } from './ticket-qr.service';
import { CreateTicketDto, CreateTicketStatusInput } from './dto/create-ticket.dto';
import { UpdateTicketDto, UpdateTicketStatusInput } from './dto/update-ticket.dto';


describe('TicketController', () => {
  let controller: TicketController;
  let crud: { create: jest.Mock; findOne: jest.Mock; update: jest.Mock };
  let qr: { generateQrSvg: jest.Mock; validateCode: jest.Mock };

  beforeEach(async () => {
    crud = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    qr = {
      generateQrSvg: jest.fn(),
      validateCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [
        { provide: TicketCrudService, useValue: crud },
        { provide: TicketQrService, useValue: qr },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
  });

  it('creates a ticket', async () => {
    const dto: CreateTicketDto = {
      eventId: 'e1',
      ownerId: 'u1',
      status: CreateTicketStatusInput.VALID,
    };
    const created = { id: 't1' };
    crud.create.mockResolvedValue(created);

    const res = await controller.createTicket(dto);
    expect(crud.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(created);
  });

  it('gets a ticket', async () => {
    const ticket = { id: 't1' };
    crud.findOne.mockResolvedValue(ticket);
    const res = await controller.getTicket('t1');
    expect(crud.findOne).toHaveBeenCalledWith('t1');
    expect(res).toEqual(ticket);
  });

  it('updates a ticket', async () => {
    const dto: UpdateTicketDto = { status: UpdateTicketStatusInput.USED };
    const updated = { id: 't1', status: 'used' };
    crud.update.mockResolvedValue(updated);
    const res = await controller.updateTicket('t1', dto);
    expect(crud.update).toHaveBeenCalledWith('t1', dto);
    expect(res).toEqual(updated);
  });

  it('returns svg QR', async () => {
    qr.generateQrSvg.mockResolvedValue('<svg></svg>');
    const svg = await controller.getTicketQr('t1');
    expect(qr.generateQrSvg).toHaveBeenCalledWith('t1');
    expect(svg).toBe('<svg></svg>');
  });

  it('validates QR and returns ok', async () => {
    qr.validateCode.mockReturnValue({ valid: true, expired: false, ticketId: 't1' });
    const res = await controller.validateTicketQr({ code: 'c' });
    expect(res).toEqual({ status: 'ok', ticketId: 't1' });
  });
});
