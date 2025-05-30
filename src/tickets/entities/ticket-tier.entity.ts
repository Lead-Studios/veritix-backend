import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm"
import { Event } from "../../events/entities/event.entity"
import { TicketPurchase } from "./ticket-pruchase"

@Entity("ticket_tiers")
export class TicketTier {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 100 })
  name: string

  @Column({ type: "text" })
  description: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number

  @Column({ type: "int" })
  totalQuantity: number

  @Column({ type: "int", default: 0 })
  soldQuantity: number

  @Column({ type: "json", nullable: true })
  benefits: string[]

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "timestamp", nullable: true })
  saleStartDate: Date

  @Column({ type: "timestamp", nullable: true })
  saleEndDate: Date

  @Column({ type: "int", nullable: true })
  maxPerUser: number

  @Column({ type: "int", default: 0 })
  sortOrder: number

//   @ManyToOne(
//     () => Event,
//     (event) => event.ticketTiers,
//     { onDelete: "CASCADE" },
//   )
//   @JoinColumn({ name: "eventId" })
//   event: Event

  @Column()
  eventId: string

  @OneToMany(
    () => TicketPurchase,
    (purchase) => purchase.ticketTier,
  )
  purchases: TicketPurchase[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Computed properties
  get availableQuantity(): number {
    return this.totalQuantity - this.soldQuantity
  }

  get isAvailable(): boolean {
    const now = new Date()
    const hasQuantity = this.availableQuantity > 0
    const isWithinSalePeriod =
      (!this.saleStartDate || now >= this.saleStartDate) && (!this.saleEndDate || now <= this.saleEndDate)

    return this.isActive && hasQuantity && isWithinSalePeriod
  }

  get isSoldOut(): boolean {
    return this.soldQuantity >= this.totalQuantity
  }
}
