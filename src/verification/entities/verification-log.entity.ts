import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('verification_logs')
export class VerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ticketId: string;

  @Column()
  status: string;

  @Column()
  markAsUsed: boolean;

  @Column('uuid', { nullable: true })
  verifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}