import { Order } from '../orders.entity';

export interface OrderItemInput {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId: string;
  eventId: string;
  items: OrderItemInput[];
}

/** Returned to the caller after createOrder — includes full Stellar payment instruction. */
export interface CreateOrderResult {
  order: Order;
  /** Memo to include in the Stellar payment transaction for matching. */
  stellarMemo: string;
  /** Platform's Stellar receiving address — send XLM here. */
  destinationAddress: string;
  /** Memo to attach to the Stellar transaction (same as stellarMemo). */
  memo: string;
  /** Total amount in XLM the buyer must send. */
  amountXLM: number;
  /** Network the payment should be made on: 'testnet' | 'mainnet'. */
  network: string;
}

export class OrderError extends Error {
  constructor(message: string, public readonly code: OrderErrorCode) {
    super(message);
    this.name = 'OrderError';
  }
}

export enum OrderErrorCode {
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  TICKET_TYPE_NOT_FOUND = 'TICKET_TYPE_NOT_FOUND',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_NOT_CANCELLABLE = 'ORDER_NOT_CANCELLABLE',
  EMPTY_ORDER = 'EMPTY_ORDER',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
}
