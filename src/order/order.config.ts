import { registerAs } from '@nestjs/config';

/**
 * Order-domain configuration.
 *
 * Consumed via ConfigService:
 *   this.config.get<OrderConfig>('order').expiryMinutes
 *
 * Environment variables:
 *   ORDER_EXPIRY_MINUTES  – how long a pending order stays alive (default 15)
 */
export interface OrderConfig {
  expiryMinutes: number;
}

export default registerAs(
  'order',
  (): OrderConfig => ({
    expiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES ?? '15', 10),
  }),
);