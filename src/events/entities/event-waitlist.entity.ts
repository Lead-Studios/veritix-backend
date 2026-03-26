import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  
  @Entity('event_waitlist')
  export class EventWaitlist {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    eventId: string;
  
    @Column()
    userId: string;
  
    @Column({ nullable: true })
    ticketTypeId: string | null;
  
    @CreateDateColumn()
    joinedAt: Date;
  
    @Column({ type: 'timestamp', nullable: true })
    notifiedAt: Date | null;
  }