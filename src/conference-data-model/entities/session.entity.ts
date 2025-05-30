import { 
    Column, 
    Entity, 
    JoinTable, 
    ManyToMany, 
    ManyToOne, 
    OneToMany, 
    PrimaryGeneratedColumn 
  } from 'typeorm';
  import { Conference } from './conference.entity';
  import { Speaker } from './speaker.entity';
  import { Room } from './room.entity';
  import { Track } from './track.entity';
  import { SessionAttendee } from './session-attendee.entity';
  
  @Entity()
  export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    title: string;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @Column()
    startTime: Date;
  
    @Column()
    endTime: Date;
  
    @Column({ default: false })
    requiresRegistration: boolean;
  
    @Column({ nullable: true })
    maxAttendees: number;
  
    @ManyToOne(() => Conference, conference => conference.sessions)
    conference: Conference;
  
    @ManyToOne(() => Track, track => track.sessions, { nullable: true })
    track: Track;
  
    @ManyToOne(() => Room, room => room.sessions)
    room: Room;
  
    @ManyToMany(() => Speaker, speaker => speaker.sessions)
    @JoinTable()
    speakers: Speaker[];
  
    @OneToMany(() => SessionAttendee, sessionAttendee => sessionAttendee.session)
    attendees: SessionAttendee[];
  
    // Helper method to check if session times overlap with another session
    overlaps(other: Session): boolean {
      return (
        (this.startTime <= other.startTime && other.startTime < this.endTime) ||
        (other.startTime <= this.startTime && this.startTime < other.endTime)
      );
    }
  
    // Helper method to check if the session is at capacity
    isAtCapacity(): boolean {
      if (!this.maxAttendees) return false;
      return this.attendees.length >= this.maxAttendees;
    }
  }