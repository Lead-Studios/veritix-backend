import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("purchase_logs")
@Index(["eventId", "createdAt"])
@Index(["purchaserId", "createdAt"])
@Index(["status", "createdAt"])
export class PurchaseLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  @Index()
  eventId: string

  @Column({ type: "uuid" })
  @Index()
  purchaserId: string

  @Column({ type: "varchar", length: 255 })
  purchaserName: string

  @Column({ type: "varchar", length: 255 })
  purchaserEmail: string

  @Column({ type: "int" })
  quantity: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount: number

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount: number

  @Column({ type: "varchar", length: 50, nullable: true })
  discountCode: string

  @Column({ type: "varchar", length: 50 })
  @Index()
  status: string // completed, failed, pending, refunded

  @Column({ type: "varchar", length: 100, nullable: true })
  paymentMethod: string

  @Column({ type: "varchar", length: 255, nullable: true })
  transactionId: string

  @Column({ type: "varchar", length: 100, nullable: true })
  @Index()
  trafficSource: string

  @Column({ type: "varchar", length: 255, nullable: true })
  referrerUrl: string

  @Column({ type: "varchar", length: 100, nullable: true })
  utmSource: string

  @Column({ type: "varchar", length: 100, nullable: true })
  utmMedium: string

  @Column({ type: "varchar", length: 100, nullable: true })
  utmCampaign: string

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string

  @Column({ type: "varchar", length: 100, nullable: true })
  @Index()
  deviceType: string

  @Column({ type: "varchar", length: 100, nullable: true })
  @Index()
  country: string

  @Column({ type: "varchar", length: 100, nullable: true })
  @Index()
  city: string

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date

  @CreateDateColumn()
  @Index()
  createdAt: Date
}
