import type { RefundStatus, RefundReason } from "../entities/refund.entity"

export class RefundResponseDto {
  id: string
  ticketId: string
  ticketNumber: string
  eventId: string
  eventName: string
  purchaserId: string
  purchaserName: string
  purchaserEmail: string
  originalAmount: number
  refundAmount: number
  processingFee: number
  reason: RefundReason
  reasonDescription?: string
  status: RefundStatus
  processedBy: string
  processedAt?: Date
  refundTransactionId?: string
  internalNotes?: string
  customerMessage?: string
  isPartialRefund: boolean
  refundPercentage: number
  createdAt: Date
}

export class RefundStatsDto {
  totalRefunds: number
  totalRefundAmount: number
  pendingRefunds: number
  processedRefunds: number
  rejectedRefunds: number
  averageRefundAmount: number
  refundsByReason: Record<RefundReason, number>
  refundsByStatus: Record<RefundStatus, number>
}

export class BulkRefundResponseDto {
  success: boolean
  message: string
  processedRefunds: RefundResponseDto[]
  failedRefunds: Array<{
    ticketId: string
    error: string
  }>
  totalAmount: number
}
