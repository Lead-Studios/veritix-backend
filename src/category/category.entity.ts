import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Event } from '../events/entities/event.entity';

@Entity()
export class Category {
  @ApiProperty({
    description: 'Unique identifier of the category',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the category',
    example: 'Technology'
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Description of the category',
    example: 'Events related to technology, innovation, and digital transformation'
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'Icon identifier for the category',
    example: 'tech-icon',
    required: false
  })
  @Column({ nullable: true })
  icon?: string;

  @ApiProperty({
    description: 'Events belonging to this category',
    type: () => [Event]
  })
  @OneToMany(() => Event, event => event.category)
  events: Event[];
}
