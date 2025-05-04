import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance])],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

// modules/sessions/session.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Speaker } from '../speakers/entities/speaker.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  track: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'timestamp with time zone' })
  scheduledStartTime: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actualStartTime: Date;

  @Column()
  durationMinutes: number;

  @Column({ type: 'uuid' })
  conferenceId: string;

  @Column({ type: 'uuid' })
  speakerId: string;

  @ManyToOne(() => Speaker)
  @JoinColumn({ name: 'speakerId' })
  speaker: Speaker;

  @Column({ nullable: true })
  roomName: string;

  @Column({ nullable: true })
  capacity: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}