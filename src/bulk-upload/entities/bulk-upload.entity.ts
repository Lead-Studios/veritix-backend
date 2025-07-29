import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"
import { BulkUploadType } from "../dto/bulk-upload.dto"

export enum BulkUploadStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  PARTIAL = "partial",
}

@Entity("bulk_uploads")
@Index(["eventId", "type"])
@Index(["status"])
export class BulkUpload {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: BulkUploadType,
  })
  type: BulkUploadType

  @Column()
  eventId: string

  @Column({
    type: "enum",
    enum: BulkUploadStatus,
    default: BulkUploadStatus.PENDING,
  })
  status: BulkUploadStatus

  @Column()
  fileName: string

  @Column()
  originalFileName: string

  @Column({ type: "int", default: 0 })
  totalRecords: number

  @Column({ type: "int", default: 0 })
  successfulRecords: number

  @Column({ type: "int", default: 0 })
  failedRecords: number

  @Column({ type: "jsonb", nullable: true })
  errors: any[]

  @Column({ type: "text", nullable: true })
  description: string

  @Column()
  uploadedBy: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date
}
