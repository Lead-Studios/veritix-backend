import { UserRole } from "../../common/enums/users-roles.enum";
import { Conference } from "../../conference/entities/conference.entity";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "../../events/entities/event.entity";
import { Ticket } from "../../tickets/entities/ticket.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { unique: true, nullable: false })
  userName: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column("varchar", { nullable: true })
  profileImageUrl: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.User,
  })
  role: UserRole;

  @OneToMany(() => Conference, (conference) => conference.organizer)
  conferences: Conference[]; // A user can organize multiple conferences

  @OneToOne(() => Ticket, (ticket) => ticket.user, {
    cascade: true,
    eager: true,
  })
  ticket: Ticket; 

  @Column("boolean", { default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Event, (event) => event.organizer)
  events: Event[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
