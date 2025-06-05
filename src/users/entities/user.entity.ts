import { UserRole } from "src/common/enums/users-roles.enum";
import { Conference } from "src/conference/entities/conference.entity";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "../../events/entities/event.entity";

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
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: "local" })
  provider: string;

  @OneToMany(() => Conference, (conference) => conference.organizer)
  conferences: Conference[]; // A user can organize multiple conferences

  @Column("boolean", { default: true })
  isActive: boolean;

  @OneToMany(() => Event, (event) => event.organizer)
  events: Event[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
