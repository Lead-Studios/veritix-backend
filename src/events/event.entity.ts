import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'timestamp' })
  closingDate: Date;

  @Column('text')
  description: string;

  @Column()
  country: string;

  @Column()
  state: string;

  @Column()
  street: string;

  @Column()
  localGovernment: string;

  @Column({ nullable: true })
  direction: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: false })
  hideLocation: boolean;

  @Column({ default: false })
  comingSoon: boolean;

  @Column({ default: false })
  transactionCharge: boolean;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  accountName: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  twitter: string;

  @Column({ nullable: true })
  instagram: string;

  @Column()
  ownerId: string;
}
