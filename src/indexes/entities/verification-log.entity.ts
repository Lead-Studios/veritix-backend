import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  
  export enum VerificationStatus {
    VALID = 'VALID',
    INVALID = 'INVALID',
    ALREADY_USED = 'ALREADY_USED',
    CANCELLED = 'CANCELLED',
    EVENT_NOT_STARTED = 'EVENT_NOT_STARTED',
    EVENT_ENDED = 'EVENT_ENDED',
  }
  
  @Entity('verification_logs')
  export class VerificationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    ticketId: string;
  
    @Column()
    eventId: string;
  
    @Column()
    status: VerificationStatus;
  
    @Column()
    isValid: boolean;
  
    @Column({ nullable: true })
    message: string;
  
    @Column({ nullable: true })
    verifiedBy: string;
  
    @CreateDateColumn()
    verifiedAt: Date;
  }