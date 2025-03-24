import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity()
export class SpecialGuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Event, (event) => event.specialGuests, {
    onDelete: 'CASCADE',
  })
  event: Event;

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  facebook?: string;

  @Column({ nullable: true })
  twitter?: string;

  @Column({ nullable: true })
  instagram?: string;
}
