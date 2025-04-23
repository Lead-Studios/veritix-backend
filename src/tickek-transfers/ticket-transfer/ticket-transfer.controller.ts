import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
  Patch,
} from "@nestjs/common"
import type { TicketTransferService } from "./ticket-transfer.service"
import type { CreateTransferDto } from "./dto/create-transfer.dto"
import type { AcceptTransferDto } from "./dto/accept-transfer.dto"
import { JwtAuthGuard } from "../../../security/guards/jwt-auth.guard"
import { TransferStatus } from "./entities/ticket-transfer.entity"

@Controller("ticket-transfers")
export class TicketTransferController {
  constructor(private readonly ticketTransferService: TicketTransferService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req, @Body() createTransferDto: CreateTransferDto) {
    const userId = req.user.id
    return this.ticketTransferService.create(userId, createTransferDto)
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req) {
    const userId = req.user.id;
    return this.ticketTransferService.findAllForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sent')
  async findSent(@Req() req) {
    const userId = req.user.id;
    return this.ticketTransferService.findSentByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('received')
  async findReceived(@Req() req) {
    const userId = req.user.id;
    return this.ticketTransferService.findReceivedByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user.id
    const transfer = await this.ticketTransferService.findOne(id)

    if (transfer.senderId !== userId && transfer.recipientId !== userId) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    }

    return transfer
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/accept")
  async accept(@Req() req, @Param('id') id: string, @Body() acceptTransferDto: AcceptTransferDto) {
    const userId = req.user.id
    return this.ticketTransferService.updateStatus(
      id,
      userId,
      TransferStatus.ACCEPTED,
      acceptTransferDto.verificationCode,
    )
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/reject")
  async reject(@Req() req, @Param('id') id: string) {
    const userId = req.user.id
    return this.ticketTransferService.updateStatus(id, userId, TransferStatus.REJECTED)
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/cancel")
  async cancel(@Req() req, @Param('id') id: string) {
    const userId = req.user.id
    return this.ticketTransferService.updateStatus(id, userId, TransferStatus.CANCELLED)
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.id
    const transfer = await this.ticketTransferService.findOne(id)

    if (transfer.senderId !== userId) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new HttpException("Cannot delete a non-pending transfer", HttpStatus.BAD_REQUEST)
    }

    return this.ticketTransferService.remove(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/verify")
  async verifyTransfer(@Req() req, @Param('id') id: string) {
    const userId = req.user.id
    return this.ticketTransferService.generateVerificationCode(id, userId)
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/complete")
  async completeTransfer(@Req() req, @Param('id') id: string, @Body() acceptTransferDto: AcceptTransferDto) {
    const userId = req.user.id
    return this.ticketTransferService.completeTransfer(id, userId, acceptTransferDto.verificationCode)
  }
}

