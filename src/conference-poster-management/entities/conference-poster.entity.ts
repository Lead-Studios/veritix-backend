import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conference } from '../../conference/entities/conference.entity';

@Entity('conference_posters')
export class ConferencePoster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string;

  @Column('text')
  description: string;

  @Column()
  conferenceId: string;

  @ManyToOne(() => Conference, (conference) => conference.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conferenceId' })
  conference: Conference;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}