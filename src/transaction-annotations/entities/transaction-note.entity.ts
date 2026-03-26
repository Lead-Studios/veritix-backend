import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity()
export class TransactionNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @ManyToOne(() => Transaction, (tx) => tx.notes, { onDelete: 'CASCADE' })
  transaction: Transaction;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}