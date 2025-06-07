import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Res,
  NotFoundException,
  Req,
} from "@nestjs/common";
import { TicketService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { Ticket } from "./entities/ticket.entity";
// import { Roles } from '../../security/decorators/roles.decorator';

import { Response, Request } from "express";
import * as fs from "fs";
import { User } from "src/users/entities/user.entity";
import { Roles } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";
import { TicketPurchaseDto } from "./dto/ticket-purchase.dto";
import { ReceiptDto } from "./dto/receipt.dto";
import { RequestWithUser } from "src/common/interfaces/request.interface";
import { PromoCodeService } from "src/promo-code/providers/promo-code.service";
import { ApplyPromoDto } from "src/promo-code/dtos/promoCodeDto";

@Controller("user/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly promoService: PromoCodeService,
  ) {}

   @Post('apply-code')
  async applyPromoCode(@Body() dto: ApplyPromoDto) {
    const promo = await this.promoService.validatePromoCode(dto.code, dto.eventId);
    return { discount: promo.discount };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER) //only admins and organizers can create ticket
  // @Roles('admin') // Only admin can create tickets
  async createTicket(@Body() dto: CreateTicketDto, @Query("user") user: User) {
    return this.ticketService.createTicket(dto, user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.GUEST)
  async getAllTickets() {
    return this.ticketService.getAllTickets();
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.GUEST)
  async getTicketById(@Param("id") id: string) {
    return this.ticketService.getTicketById(id);
  }

  @Get("/event/:eventId/tickets")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.GUEST)
  async getTicketsByEvent(@Param("eventId") eventId: string) {
    return this.ticketService.getTicketsByEvent(eventId);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async updateTicket(
    @Param("id") id: string,
    @Body() dto: Partial<CreateTicketDto>,
    @Query("user") user: User,
  ) {
    return this.ticketService.updateTicket(id, dto, user);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  delete(@Param("id") id: string, @Query("user") user: User) {
    return this.ticketService.deleteTicket(id, user);
  }

  // route to get all user ticket history
  @Get("history")
  async getUserTicketHistory(
    @Query("userId") userId: string,
  ): Promise<Ticket[]> {
    if (!userId) {
      throw new NotFoundException("User ID is required");
    }
    return this.ticketService.getUserTicketHistory(userId);
  }

  // route to get a single ticket history by ID
  @Get("history/:id")
  async getUserTicketById(
    @Param("id") id: string,
    @Query("userId") userId: string,
  ): Promise<Ticket> {
    if (!userId) {
      throw new NotFoundException("User ID is required");
    }
    return this.ticketService.getUserTicketById(userId, id);
  }

  // route to get ticket details
  @Get("details/:id")
  async getTicketDetails(@Param("id") id: string): Promise<Ticket> {
    return this.ticketService.getTicketDetails(id);
  }

  @Get("receipt/:id")
  async getTicketReceipt(@Param("id") id: string, @Res() res: Response) {
    try {
      const filePath = await this.ticketService.generateTicketReceipt(id);

      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${filePath}`,
      });
      fileStream.pipe(res);
    } catch (error) {
      throw new NotFoundException("Receipt generation failed");
    }
  }

  @Post("purchase")
  @UseGuards(JwtAuthGuard)
  async purchaseTickets(
    @Req() req: RequestWithUser,
    @Body() purchaseDto: TicketPurchaseDto,
  ): Promise<ReceiptDto> {
    return this.ticketService.purchaseTickets(req.user.userId, purchaseDto);
  }

  @Get("receipt/:receiptId")
  @UseGuards(JwtAuthGuard)
  async getReceipt(
    @Req() req: RequestWithUser,
    @Param("receiptId") receiptId: string,
  ): Promise<ReceiptDto> {
    return this.ticketService.getReceipt(receiptId, req.user.userId);
  }

  @Get(':id/calendar.ics')
async downloadICal(
  @Param('id', ParseUUIDPipe) id: string,
  @Query('token') token: string,
  @Res() res: Response,
) {
  const icsFile = await this.ticketService.generateICalFile(id, token);

  res.set({
    'Content-Type': 'text/calendar',
    'Content-Disposition': `attachment; filename="ticket-${id}.ics"`,
  });

  res.send(icsFile);
}
}
