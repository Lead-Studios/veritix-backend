import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  
  @Entity('ticket_transfers')
  export class TicketTransfer {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    ticketId: string;
  
    @Column()
    fromUserId: string;
  
    @Column()
    toUserId: string;
  
    @Column()
    reason: 'gift' | 'resale' | 'other';
  
    @CreateDateColumn()
    transferredAt: Date;
  }