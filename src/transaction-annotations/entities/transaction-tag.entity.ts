import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity()
@Index(['tag', 'transaction'], { unique: true })
export class TransactionTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tag: string;

  @ManyToOne(() => Transaction, (tx) => tx.tags, { onDelete: 'CASCADE' })
  transaction: Transaction;

  @Column()
  userId: string;
}