import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
  } from 'typeorm';
  import { Event } from '../../events/entities/event.entity';
  import { Ticket } from '../../tickets/entities/ticket.entity';
  import { User } from '../../users/entities/user.entity';
  
  @Entity()
  export class TicketPurchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    receiptId: string;
  
    @ManyToOne(() => User)
    user: User;
  
    @ManyToOne(() => Event)
    event: Event;
  
    @ManyToOne(() => Ticket)
    ticket: Ticket;
  
    @Column()
    ticketQuantity: number;
  
    @Column('decimal', { precision: 10, scale: 2 })
    totalPrice: number;

    @Column('decimal', { precision: 20, scale: 7, nullable: true })
    totalAmountXLM: number;
  
    @Column('jsonb')
    billingDetails: {
      fullName: string;
      email: string;
      phoneNumber: string;
    };
  
    @Column('jsonb')
    addressDetails: {
      country: string;
      state: string;
      city: string;
      street: string;
      postalCode: string;
    };
  
    @CreateDateColumn()
    transactionDate: Date;
  }