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

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { unique: true, nullable: false })
  userName: string;

  @Column("varchar", { unique: true, nullable: false })
  email: string;

  @Column("varchar", { nullable: false })
  password: string;

  @Column("varchar", { nullable: true })
  firstName: string;

  @Column("varchar", { nullable: true })
  lastName: string;

  @Column("varchar", { nullable: true, default: "" })
  profileImageUrl: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.User,
  })
  role: UserRole;

  @OneToMany(() => Conference, (conference) => conference.organizer)
  conferences: Conference[]; // A user can organize multiple conferences

  @Column("boolean", { default: true })
  isActive: boolean;

  @Column("boolean", { default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
