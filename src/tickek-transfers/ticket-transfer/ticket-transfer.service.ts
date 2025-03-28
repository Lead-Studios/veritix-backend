import { Injectable, HttpException, HttpStatus } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TicketTransfer, TransferStatus, TransferType } from "./entities/ticket-transfer.entity"
import type { CreateTransferDto } from "./dto/create-transfer.dto"
import type { TicketsService } from "../tickets/tickets.service"
import type { UsersService } from "../users/users.service"
import type { NotificationsService } from "../notifications/notifications.service"
import { randomBytes } from "crypto"
import { addHours } from "date-fns"

@Injectable()
export class TicketTransferService {
  constructor(
    @InjectRepository(TicketTransfer)
    private ticketTransferRepository: Repository<TicketTransfer>,
    private ticketsService: TicketsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createTransferDto: CreateTransferDto) {
    // Validate ticket ownership
    const ticket = await this.ticketsService.findOne(createTransferDto.ticketId)
    if (!ticket) {
      throw new HttpException("Ticket not found", HttpStatus.NOT_FOUND)
    }

    if (ticket.userId !== userId) {
      throw new HttpException("You do not own this ticket", HttpStatus.FORBIDDEN)
    }

    if (ticket.isUsed) {
      throw new HttpException("Cannot transfer a used ticket", HttpStatus.BAD_REQUEST)
    }

    // Check if there's already a pending transfer for this ticket
    const existingTransfer = await this.ticketTransferRepository.findOne({
      where: {
        ticketId: createTransferDto.ticketId,
        status: TransferStatus.PENDING,
      },
    })

    if (existingTransfer) {
      throw new HttpException("There is already a pending transfer for this ticket", HttpStatus.CONFLICT)
    }

    // Create transfer entity
    const transfer = new TicketTransfer()
    transfer.ticketId = createTransferDto.ticketId
    transfer.senderId = userId
    transfer.type = createTransferDto.type

    // Handle recipient (email or id)
    if (createTransferDto.recipientId) {
      const recipient = await this.usersService.findOne(createTransferDto.recipientId)
      if (!recipient) {
        throw new HttpException("Recipient not found", HttpStatus.NOT_FOUND)
      }
      transfer.recipientId = createTransferDto.recipientId
      transfer.recipientEmail = recipient.email
    } else if (createTransferDto.recipientEmail) {
      // Find if user exists with this email
      const recipient = await this.usersService.findByEmail(createTransferDto.recipientEmail)
      if (recipient) {
        transfer.recipientId = recipient.id
      }
      transfer.recipientEmail = createTransferDto.recipientEmail
    } else {
      throw new HttpException("Either recipientId or recipientEmail is required", HttpStatus.BAD_REQUEST)
    }

    // Handle price for resale
    if (createTransferDto.type === TransferType.RESALE) {
      if (!createTransferDto.price || createTransferDto.price <= 0) {
        throw new HttpException("Price is required for resale", HttpStatus.BAD_REQUEST)
      }
      transfer.price = createTransferDto.price
    }

    // Save the transfer
    const savedTransfer = await this.ticketTransferRepository.save(transfer)

    // Send notification to recipient if they exist in the system
    if (transfer.recipientId) {
      await this.notificationsService.create({
        userId: transfer.recipientId,
        title: "New Ticket Transfer",
        message: `You have received a ticket ${transfer.type === TransferType.RESALE ? "resale" : "transfer"} offer.`,
        type: "ticket_transfer",
        data: { transferId: savedTransfer.id },
      })
    } else if (transfer.recipientEmail) {
      // Send email notification to non-registered users
      // This would typically use an email service
      console.log(`Email notification would be sent to ${transfer.recipientEmail}`)
    }

    return savedTransfer
  }

  async findAllForUser(userId: string) {
    return this.ticketTransferRepository.find({
      where: [{ senderId: userId }, { recipientId: userId }],
      relations: ["ticket", "sender", "recipient"],
      order: { createdAt: "DESC" },
    })
  }

  async findSentByUser(userId: string) {
    return this.ticketTransferRepository.find({
      where: { senderId: userId },
      relations: ["ticket", "recipient"],
      order: { createdAt: "DESC" },
    })
  }

  async findReceivedByUser(userId: string) {
    return this.ticketTransferRepository.find({
      where: { recipientId: userId },
      relations: ["ticket", "sender"],
      order: { createdAt: "DESC" },
    })
  }

  async findOne(id: string) {
    const transfer = await this.ticketTransferRepository.findOne({
      where: { id },
      relations: ["ticket", "sender", "recipient"],
    })

    if (!transfer) {
      throw new HttpException("Transfer not found", HttpStatus.NOT_FOUND)
    }

    return transfer
  }

  async updateStatus(id: string, userId: string, status: TransferStatus, verificationCode?: string) {
    const transfer = await this.findOne(id)

    // Validate user is involved in the transfer
    if (transfer.senderId !== userId && transfer.recipientId !== userId) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    }

    // Validate status transition
    if (transfer.status !== TransferStatus.PENDING) {
      throw new HttpException(`Cannot ${status} a non-pending transfer`, HttpStatus.BAD_REQUEST)
    }

    // For accepting, only recipient can do it
    if (status === TransferStatus.ACCEPTED && transfer.recipientId !== userId) {
      throw new HttpException("Only the recipient can accept a transfer", HttpStatus.FORBIDDEN)
    }

    // For cancelling, only sender can do it
    if (status === TransferStatus.CANCELLED && transfer.senderId !== userId) {
      throw new HttpException("Only the sender can cancel a transfer", HttpStatus.FORBIDDEN)
    }

    // For rejecting, only recipient can do it
    if (status === TransferStatus.REJECTED && transfer.recipientId !== userId) {
      throw new HttpException("Only the recipient can reject a transfer", HttpStatus.FORBIDDEN)
    }

    // Verify code if accepting
    if (status === TransferStatus.ACCEPTED && verificationCode) {
      if (!transfer.verificationCode || transfer.verificationCode !== verificationCode) {
        throw new HttpException("Invalid verification code", HttpStatus.BAD_REQUEST)
      }

      if (transfer.verificationExpiry && new Date() > transfer.verificationExpiry) {
        throw new HttpException("Verification code has expired", HttpStatus.BAD_REQUEST)
      }

      transfer.isVerified = true
    }

    // Update status
    transfer.status = status

    // If accepted, update ticket ownership
    if (status === TransferStatus.ACCEPTED) {
      await this.ticketsService.updateOwner(transfer.ticketId, transfer.recipientId)
      transfer.completedAt = new Date()
    }

    // Save the updated transfer
    const updatedTransfer = await this.ticketTransferRepository.save(transfer)

    // Send notification to the other party
    const notificationRecipientId = userId === transfer.senderId ? transfer.recipientId : transfer.senderId
    if (notificationRecipientId) {
      await this.notificationsService.create({
        userId: notificationRecipientId,
        title: `Transfer ${status}`,
        message: `Your ticket transfer has been ${status}.`,
        type: "ticket_transfer_update",
        data: { transferId: id, status },
      })
    }

    return updatedTransfer
  }

  async remove(id: string) {
    const transfer = await this.findOne(id)
    return this.ticketTransferRepository.remove(transfer)
  }

  async generateVerificationCode(id: string, userId: string) {
    const transfer = await this.findOne(id)

    // Only sender can generate verification code
    if (transfer.senderId !== userId) {
      throw new HttpException("Only the sender can generate verification code", HttpStatus.FORBIDDEN)
    }

    // Only pending transfers can have verification codes
    if (transfer.status !== TransferStatus.PENDING) {
      throw new HttpException("Can only generate verification code for pending transfers", HttpStatus.BAD_REQUEST)
    }

    // Generate a random 6-digit code
    const verificationCode = randomBytes(3).toString("hex").toUpperCase()

    // Set expiry to 24 hours from now
    const verificationExpiry = addHours(new Date(), 24)

    // Update the transfer
    transfer.verificationCode = verificationCode
    transfer.verificationExpiry = verificationExpiry

    await this.ticketTransferRepository.save(transfer)

    // Send notification to recipient
    if (transfer.recipientId) {
      await this.notificationsService.create({
        userId: transfer.recipientId,
        title: "Verification Code",
        message: `Use code ${verificationCode} to complete the ticket transfer.`,
        type: "ticket_transfer_verification",
        data: { transferId: id, verificationCode },
      })
    }

    return { success: true, message: "Verification code generated" }
  }

  async completeTransfer(id: string, userId: string, verificationCode: string) {
    const transfer = await this.findOne(id)

    // Only recipient can complete transfer
    if (transfer.recipientId !== userId) {
      throw new HttpException("Only the recipient can complete the transfer", HttpStatus.FORBIDDEN)
    }

    // Only accepted transfers can be completed
    if (transfer.status !== TransferStatus.ACCEPTED) {
      throw new HttpException("Can only complete accepted transfers", HttpStatus.BAD_REQUEST)
    }

    // Verify the code
    if (!transfer.verificationCode || transfer.verificationCode !== verificationCode) {
      throw new HttpException("Invalid verification code", HttpStatus.BAD_REQUEST)
    }

    if (transfer.verificationExpiry && new Date() > transfer.verificationExpiry) {
      throw new HttpException("Verification code has expired", HttpStatus.BAD_REQUEST)
    }

    // Mark as completed
    transfer.status = TransferStatus.COMPLETED
    transfer.completedAt = new Date()
    transfer.isVerified = true

    const completedTransfer = await this.ticketTransferRepository.save(transfer)

    // Send notification to sender
    await this.notificationsService.create({
      userId: transfer.senderId,
      title: "Transfer Completed",
      message: "Your ticket transfer has been completed successfully.",
      type: "ticket_transfer_completed",
      data: { transferId: id },
    })

    return completedTransfer
  }
}

