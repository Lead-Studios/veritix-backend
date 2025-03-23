import { Event } from 'src/events/entities/event.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';

@Entity()
export class Sponsor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brandImage: string;

  @Column()
  brandName: string;

  @Column()
  brandWebsite: string;

  @Column('json')
  socialMediaLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
  };

  @ManyToMany(() => Event, (event) => event.sponsors)
  @JoinTable() // Defines this side as the owning side of the relation
  events: Event[];
}