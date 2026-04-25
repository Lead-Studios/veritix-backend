import { Order } from '../orders.entity';

export class CreateOrderItemDto {
  ticketTypeId: string;
  quantity: number;
}

export class CreateOrderDto {
  eventId: string;
  items: CreateOrderItemDto[];
}

export interface CreateOrderInput {
  userId: string;
  eventId: string;
  items: CreateOrderItemDto[];
}

export interface CreateOrderResult {
  order: Order;
  stellarMemo: string;
  amountXLM: number;
}
