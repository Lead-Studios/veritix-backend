import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Webhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  organizerId: number;

  @Column('simple-array')
  events: string[]; 

  @Column()
  callbackUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
