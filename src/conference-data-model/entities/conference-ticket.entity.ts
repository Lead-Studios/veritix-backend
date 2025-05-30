import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne, 
    ManyToMany, 
    JoinTable 
  } from 'typeorm';
  import { Conference } from './conference.entity';
  import { Session } from './session.entity';
  import { User } from '../../users/entities/user.entity';
  
  export enum TicketType {
    FULL_ACCESS = 'full_access',
    BASIC = 'basic',
    SESSION_SPECIFIC = 'session_specific',
  }
  
  @Entity()
  export class ConferenceTicket {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    ticketNumber: string;
  
    @Column({
      type: 'enum',
      enum: TicketType,
      default: TicketType.FULL_ACCESS
    })
    type: TicketType;
  
    @Column()
    price: number;
  
    @Column({ default: false })
    used: boolean;
  
    @Column()
    purchasedAt: Date;
  
    @ManyToOne(() => Conference, conference => conference.tickets)
    conference: Conference;
  
    @ManyToOne(() => User)
    owner: User;
  
    @ManyToMany(() => Session)
    @JoinTable()
    accessibleSessions: Session[];
  
    
    canAccessSession(sessionId: string): boolean {
      if (this.type === TicketType.FULL_ACCESS) return true;
      
      if (this.type === TicketType.SESSION_SPECIFIC) {
        return this.accessibleSessions.some(session => session.id === sessionId);
      }
      
      return false;
    }
  }
  