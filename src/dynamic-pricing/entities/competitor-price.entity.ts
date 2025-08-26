import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('competitor_prices')
@Index(['eventType', 'location', 'createdAt'])
@Index(['competitorName', 'createdAt'])
export class CompetitorPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  competitorName: string;

  @Column({ type: 'varchar', length: 255 })
  eventName: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 50 })
  ticketType: string; // 'general', 'vip', 'early_bird', etc.

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int' })
  availableTickets: number;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 500 })
  sourceUrl: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number; // 0-100, confidence in the data accuracy

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    scrapingMethod: string;
    dataQuality: string;
    priceHistory: Array<{
      price: number;
      timestamp: string;
    }>;
    additionalFees?: number;
    currency: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
