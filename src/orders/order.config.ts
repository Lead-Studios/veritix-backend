import { registerAs } from '@nestjs/config';

export interface OrderConfig {
  expiryMinutes: number;
}

export default registerAs('order', () => ({
  expiryMinutes: Number(process.env.ORDER_EXPIRY_MINUTES ?? 15),
}));
