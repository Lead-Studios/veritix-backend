import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity()
export class Sponsor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brandImage: string;

  @Column()
  brandName: string;

  @Column()
  brandWebsite: string;

  @Column({ nullable: true })
  facebook?: string;

  @Column({ nullable: true })
  twitter?: string;

  @Column({ nullable: true })
  instagram?: string;

  @ManyToOne(() => Event, (event) => event.sponsors, { onDelete: 'CASCADE' })
  event: Event;
}
