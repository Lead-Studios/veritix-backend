import { DataSource } from 'typeorm';
import { User } from '../../src/users/entities/user.entity';
import { UserRole } from '../../src/users/enums/user-role.enum';
import { Event } from '../../src/events/entities/event.entity';
import { EventStatus } from '../../src/events/enums/event-status.enum';
import { TicketType } from '../../src/ticket-types/entities/ticket-type.entity';
import { Order } from '../../src/orders/entities/order.entity';
import { OrderStatus } from '../../src/orders/enums/order-status.enum';

export async function createUser(
  dataSource: DataSource,
  overrides: Partial<User> = {},
): Promise<User> {
  const userRepository = dataSource.getRepository(User);
  const user = userRepository.create({
    email: `test-${Date.now()}@example.com`,
    fullName: 'Test User',
    password: 'hashedpassword', // Assume hashed
    role: UserRole.SUBSCRIBER,
    isVerified: true,
    ...overrides,
  });
  return await userRepository.save(user);
}

export async function createEvent(
  dataSource: DataSource,
  organizerId: string,
  overrides: Partial<Event> = {},
): Promise<Event> {
  const eventRepository = dataSource.getRepository(Event);
  const event = eventRepository.create({
    title: 'Test Event',
    description: 'Test Description',
    status: EventStatus.PUBLISHED,
    organizerId,
    venue: 'Test Venue',
    city: 'Test City',
    countryCode: 'US',
    isVirtual: false,
    eventDate: new Date(Date.now() + 86400000), // Tomorrow
    capacity: 100,
    ...overrides,
  });
  return await eventRepository.save(event);
}

export async function createTicketType(
  dataSource: DataSource,
  eventId: string,
  overrides: Partial<TicketType> = {},
): Promise<TicketType> {
  const ticketTypeRepository = dataSource.getRepository(TicketType);
  const ticketType = ticketTypeRepository.create({
    name: 'General Admission',
    description: 'Standard ticket',
    price: 50.0,
    totalQuantity: 100,
    soldQuantity: 0,
    isActive: true,
    eventId,
    ...overrides,
  });
  return await ticketTypeRepository.save(ticketType);
}

export async function createOrder(
  dataSource: DataSource,
  userId: string,
  eventId: string,
  overrides: Partial<Order> = {},
): Promise<Order> {
  const orderRepository = dataSource.getRepository(Order);
  const order = orderRepository.create({
    userId,
    eventId,
    status: OrderStatus.PENDING,
    totalAmountUSD: 50.0,
    totalAmountXLM: 0,
    stellarMemo: `memo-${Date.now()}`,
    ...overrides,
  });
  return await orderRepository.save(order);
}
