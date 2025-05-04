import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

export enum NotificationSatus {
  UNREAD = "Unread",
  READ = "Read",
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  userId: string;

  @Column("uuid")
  @Index()
  eventId: string;

  @Column()
  message: string;

  @Column({ default: NotificationSatus.UNREAD })
  status?: string;

  @Column()
  timestamp: Date;
}
