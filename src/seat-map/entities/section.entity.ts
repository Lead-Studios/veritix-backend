import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SeatMap } from './seat-map.entity';
import { Seat } from './seat.entity';

export enum SectionType {
  ORCHESTRA = 'orchestra',
  BALCONY = 'balcony',
  MEZZANINE = 'mezzanine',
  BOX = 'box',
  GENERAL_ADMISSION = 'general_admission',
  VIP = 'vip',
  STANDING = 'standing',
}

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: SectionType })
  type: SectionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'json', nullable: true })
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };

  @Column({ type: 'json', nullable: true })
  seatLayout: {
    rows: number;
    seatsPerRow: number;
    aislePositions?: number[];
    rowLabels?: string[];
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => SeatMap, (seatMap) => seatMap.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatMapId' })
  seatMap: SeatMap;

  @Column()
  seatMapId: string;

  @OneToMany(() => Seat, (seat) => seat.section, { cascade: true })
  seats: Seat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
