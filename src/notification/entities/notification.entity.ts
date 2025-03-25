import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum NotificationSatus {
    UNREAD = 'Unread',
    READ = 'Read'
}

@Entity()
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index()  
    userId: number;

    @Column()
    @Index()  
    eventId: number;

    @Column()
    message: string;

    @Column({ default: NotificationSatus.UNREAD })
    status?: string;

    @Column()
    timestamp: Date;
}