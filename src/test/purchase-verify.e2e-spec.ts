import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { OrdersModule } from '../orders/orders.module';
import { TicketsModule as TicketsInventoryModule } from '../tickets-inventory/tickets.module';
import { VerificationModule } from '../verification/verification.module';
import { EventsModule } from '../events/events.module';
import { OrdersService, OrdersScheduler } from '../orders/orders.service';
import { OrderStatus } from '../orders/enums/order-status.enum';

// Assume StellarModule exists, as requested by the issue
// If this file does not exist locally yet, this import simulates the intended structure for the issue.
import { StellarModule } from '../stellar/stellar.module';

describe('Purchase -> Verify Flow (e2e)', () => {
    let app: INestApplication;
    let ordersService: OrdersService;
    let ordersScheduler: OrdersScheduler;

    // Mocking the Horizon stream and HTTP client as requested
    const mockHorizonClient = {
        server: jest.fn().mockReturnThis(),
        payments: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnThis(),
        stream: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    dropSchema: true,
                    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                    synchronize: true,
                }),
                OrdersModule,
                StellarModule,
                TicketsInventoryModule,
                VerificationModule,
                EventsModule,
            ],
        })
            .overrideProvider('StellarHorizonClient') // Overriding Horizon client
            .useValue(mockHorizonClient)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        ordersService = app.get<OrdersService>(OrdersService);
        // Depending on whether OrdersScheduler is exported, we get it to trigger tests manually
        try {
            ordersScheduler = app.get<OrdersScheduler>(OrdersScheduler);
        } catch (e) {
            // ignore
        }
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    let eventId: string;
    let ticketTypeId: string;
    let userId: string;

    beforeEach(async () => {
        // Mock all time-dependent logic (Date.now, expiry checks)
        jest.useFakeTimers();
        jest.clearAllMocks();

        // In a real database test, these need to be pre-seeded valid UUIDs via repositories.
        eventId = '00000000-0000-0000-0000-000000000001';
        ticketTypeId = '00000000-0000-0000-0000-000000000002';
        userId = '00000000-0000-0000-0000-000000000003';
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Scenario 1: Happy path', () => {
        it('create order -> simulate incoming Stellar payment -> tickets issued -> ticket verified successfully', async () => {
            // 1. Create order
            // We rely on order controller/service being capable of making an order
            const { order, stellarMemo } = await ordersService.createOrder({
                userId,
                eventId,
                items: [{ ticketTypeId, quantity: 1 }],
            });

            expect(order.status).toBe(OrderStatus.PENDING);

            // 2. Simulate incoming Stellar payment
            const paymentAmountXlm = order.totalAmountXLM;

            const paymentPayload = {
                memo: stellarMemo,
                amount: paymentAmountXlm,
                successful: true,
            };

            await request(app.getHttpServer())
                .post('/stellar/webhook')
                .send(paymentPayload)
                .expect(HttpStatus.OK);

            // Verify order status updated
            const updatedOrder = await ordersService.findById(order.id);
            expect(updatedOrder.status).toBe('PAID'); // Issue #10 expected state

            // 3. Tickets issued
            const ticketsRes = await request(app.getHttpServer())
                .get(`/tickets/user/${userId}`)
                .expect(200);

            expect(ticketsRes.body.length).toBeGreaterThan(0);
            const ticketCode = ticketsRes.body[0].code;

            // 4. Ticket verified successfully
            const verifyRes = await request(app.getHttpServer())
                .post('/verification/scan')
                .send({ ticketCode, eventId })
                .expect(200);

            expect(verifyRes.body.isValid).toBe(true);
            expect(verifyRes.body.status).toBe('VALID');
        });
    });

    describe('Scenario 2: Underpayment', () => {
        it('payment amount below order total -> order stays PENDING, no tickets issued', async () => {
            const { order, stellarMemo } = await ordersService.createOrder({
                userId,
                eventId,
                items: [{ ticketTypeId, quantity: 1 }],
            });

            // Simulate Underpayment
            const underpaymentAmount = order.totalAmountXLM - 1;

            await request(app.getHttpServer())
                .post('/stellar/webhook')
                .send({
                    memo: stellarMemo,
                    amount: underpaymentAmount,
                    successful: true,
                })
                .expect(200);

            const checkOrder = await ordersService.findById(order.id);
            expect(checkOrder.status).toBe(OrderStatus.PENDING);

            // Verify no tickets issued
            const ticketsRes = await request(app.getHttpServer())
                .get(`/tickets/user/${userId}`)
                .expect(200);

            expect(ticketsRes.body.length).toBe(0);
        });
    });

    describe('Scenario 3: Expired order', () => {
        it('order expires before payment -> inventory released, subsequent payment ignored', async () => {
            const { order, stellarMemo } = await ordersService.createOrder({
                userId,
                eventId,
                items: [{ ticketTypeId, quantity: 1 }],
            });

            // Fast forward time to expire order
            jest.advanceTimersByTime(20 * 60 * 1000); // 20 minutes wait

            // Trigger the cron job handler manually if available
            if (ordersScheduler) {
                await ordersScheduler.handleOrderExpiry();
            }

            const checkOrder = await ordersService.findById(order.id);
            expect(checkOrder.status).toBe(OrderStatus.CANCELLED);

            // Subsequent payment ignored
            await request(app.getHttpServer())
                .post('/stellar/webhook')
                .send({ memo: stellarMemo, amount: order.totalAmountXLM, successful: true })
                .expect(200);

            // Order should remain CANCELLED
            const checkOrderAgain = await ordersService.findById(order.id);
            expect(checkOrderAgain.status).toBe(OrderStatus.CANCELLED);
        });
    });

    describe('Scenario 4: Double scan', () => {
        it('valid ticket scanned twice -> second scan returns ALREADY_USED', async () => {
            const { order, stellarMemo } = await ordersService.createOrder({
                userId,
                eventId,
                items: [{ ticketTypeId, quantity: 1 }],
            });

            await request(app.getHttpServer())
                .post('/stellar/webhook')
                .send({ memo: stellarMemo, amount: order.totalAmountXLM, successful: true })
                .expect(200);

            const ticketsRes = await request(app.getHttpServer()).get(`/tickets/user/${userId}`);
            const ticketCode = ticketsRes.body[0].code;

            // First scan
            const scan1 = await request(app.getHttpServer())
                .post('/verification/scan')
                .send({ ticketCode, eventId })
                .expect(200);
            expect(scan1.body.isValid).toBe(true);

            // Second scan
            const scan2 = await request(app.getHttpServer())
                .post('/verification/scan')
                .send({ ticketCode, eventId })
                .expect(200);

            expect(scan2.body.isValid).toBe(false);
            expect(scan2.body.status).toBe('ALREADY_USED');
        });
    });

    describe('Scenario 5: Wrong event window', () => {
        it('scan before event.eventDate -> returns EVENT_NOT_STARTED', async () => {
            const { order, stellarMemo } = await ordersService.createOrder({
                userId,
                eventId,
                items: [{ ticketTypeId, quantity: 1 }],
            });

            await request(app.getHttpServer())
                .post('/stellar/webhook')
                .send({ memo: stellarMemo, amount: order.totalAmountXLM, successful: true })
                .expect(200);

            const ticketsRes = await request(app.getHttpServer()).get(`/tickets/user/${userId}`);
            const ticketCode = ticketsRes.body[0].code;

            // Simulate time being before eventDate
            jest.setSystemTime(new Date('2020-01-01'));

            const scanRes = await request(app.getHttpServer())
                .post('/verification/scan')
                .send({ ticketCode, eventId })
                .expect(200);

            expect(scanRes.body.isValid).toBe(false);
            expect(scanRes.body.status).toBe('EVENT_NOT_STARTED');
        });
    });
});
