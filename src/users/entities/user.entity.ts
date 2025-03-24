import { UserRole } from "src/common/enums/users-roles.enum";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
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

  @Column("varchar", { nullable: true })
  profileImageUrl: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.User,
  })
  role: UserRole;

  @Column("boolean", { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
