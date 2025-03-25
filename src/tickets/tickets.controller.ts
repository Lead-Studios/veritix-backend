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
} from "@nestjs/common";
import { TicketService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { Ticket } from "./entities/ticket.entity";
//import { Roles } from '../../security/decorators/roles.decorator';
import { Response } from "express";
import * as fs from "fs";

@Controller("user/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  //@Roles('admin') // Only admin can create tickets
  async createTicket(@Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(dto);
  }

  @Get()
  async getAllTickets() {
    return this.ticketService.getAllTickets();
  }

  @Get(":id")
  async getTicketById(@Param("id") id: string) {
    return this.ticketService.getTicketById(id);
  }

  @Get("/event/:eventId")
  async getTicketsByEvent(@Param("eventId") eventId: string) {
    return this.ticketService.getTicketsByEvent(eventId);
  }

  @Put(":id")
  //@Roles('admin') // Only admin can update tickets
  async updateTicket(
    @Param("id") id: string,
    @Body() dto: Partial<CreateTicketDto>,
  ) {
    return this.ticketService.updateTicket(id, dto);
  }

  @Delete(":id")
  //@Roles('admin') // Only admin can delete tickets
  async deleteTicket(@Param("id") id: string) {
    return this.ticketService.deleteTicket(id);
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
}
