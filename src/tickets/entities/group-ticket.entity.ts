import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TicketPurchase } from "./ticket-pruchase";
import { User } from "src/users/entities/user.entity";

@Entity()
export class GroupTicket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => TicketPurchase, (purchase) => purchase.groupTickets)
  purchase: TicketPurchase;

  @Column()
  purchaseId: string;

  @Column()
  ticketCode: string;

  @Column({ nullable: true })
  assignedToName: string;

  @Column({ nullable: true })
  assignedToEmail: string;

  @Column({ default: false })
  isTransferred: boolean;

  @Column({ nullable: true })
  transferredToUserId: string;

  @ManyToOne(() => User, { nullable: true })
  transferredToUser: User;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  qrCode: string;
}
