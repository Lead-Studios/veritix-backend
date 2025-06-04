import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum TicketStatus {
  PURCHASED = 'purchased',
  REFUNDED = 'refunded',
}

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column()
  userId: string;

  @Column('decimal')
  price: number;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.PURCHASED })
  status: TicketStatus;

  @Column({ nullable: true })
  refundAmount?: number;

  @Column({ nullable: true })
  refundReason?: string;

  @Column({ nullable: true })
  refundedAt?: Date;
}


