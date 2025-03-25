import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum NotificationSatus {
    UNREAD = 'Unread',
    READ = 'Read'
}

@Entity()
export class Notification {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    @Index()  
    userId: string;

    @Column()
    @Index()  
    eventId: string;

    @Column()
    message: string;

    @Column({ default: NotificationSatus.UNREAD })
    status?: string;

    @Column()
    timestamp: Date;
}