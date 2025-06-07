import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Admin } from "../../admin/entities/admin.entity";

export enum AuditLogType {
  TICKET_TRANSFER = "ticket_transfer",
  TICKET_REFUND = "ticket_refund",
  LOGIN_FAILURE = "login_failure",
  LOGIN_SUCCESS = "login_success",
  USER_REGISTRATION = "user_registration",
  USER_UPDATE = "user_update",
  ADMIN_ACTION = "admin_action",
  PAYMENT_PROCESSED = "payment_processed",
  TICKET_VERIFICATION = "ticket_verification",
  AUTH_FAILURE = "auth_failure",
  AUTH_SUCCESS = "auth_success",
}

@Entity("audit_log")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: AuditLogType,
  })
  type: AuditLogType;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ nullable: true })
  adminId: number;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: "adminId" })
  admin: Admin;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  description: string;
}
