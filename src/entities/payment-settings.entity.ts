import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentProvider } from '../enums/payment-provider.enum';

@Entity('payment_settings')
export class PaymentSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
    enum: PaymentProvider,
    default: PaymentProvider.STRIPE,
  })
  defaultProvider: PaymentProvider;

  @Column({ default: true })
  stripeEnabled: boolean;

  @Column({ default: true })
  paystackEnabled: boolean;

  @Column({ default: true })
  flutterwaveEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  providerSettings: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}