import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { CreateTicketPurchaseDto } from "./dto/create-ticket-purchase.dto";
import { TicketPurchaseService } from "./provider/tickets-purchase.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { PaymentDetails } from "../payment/interfaces/payment-service.interface";

@ApiTags("Tickets")
@ApiBearerAuth()
@Controller("tickets")
@UseGuards(JwtAuthGuard)
export class TicketPurchaseController {
  constructor(private readonly ticketPurchaseService: TicketPurchaseService) {}

  @Post("purchase")
  @ApiOperation({
    summary: "Purchase tickets (individual or group)",
    description:
      "Process a ticket purchase with payment details. Supports both individual and group bookings with shared group codes.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["createTicketPurchaseDto", "paymentDetails"],
      properties: {
        createTicketPurchaseDto: {
          $ref: "#/components/schemas/CreateTicketPurchaseDto",
        },
        paymentDetails: {
          $ref: "#/components/schemas/PaymentDetails",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Tickets purchased successfully",
    schema: {
      example: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        receiptId: "TXN-123456",
        ticketQuantity: 4,
        totalPrice: 399.96,
        transactionDate: "2025-04-30T10:30:00Z",
        isGroupBooking: true,
        groupCode: "GRP-LXY7F9-A8B2C3",
        groupName: "Smith Family Reunion",
      },
    },
  })
  async purchaseTickets(
    @Request() req,
    @Body() createTicketPurchaseDto: CreateTicketPurchaseDto,
    @Body("paymentDetails") paymentDetails: PaymentDetails,
  ) {
    return this.ticketPurchaseService.purchaseTickets(
      req.user.id,
      createTicketPurchaseDto,
      paymentDetails,
    );
  }

  @Get("receipt/:orderId")
  @ApiOperation({
    summary: "Get purchase receipt",
    description:
      "Retrieve the detailed receipt for a ticket purchase including group booking details if applicable",
  })
  async getReceipt(@Param("orderId") orderId: string) {
    return this.ticketPurchaseService.getReceipt(orderId);
  }

  // NEW: Group booking endpoints
  @Get("group/:groupCode")
  @ApiOperation({
    summary: "Get group booking details",
    description: "Retrieve details for a group booking using the group code",
  })
  @ApiParam({
    name: "groupCode",
    description: "Group booking code",
    example: "GRP-LXY7F9-A8B2C3",
  })
  async getGroupBookingDetails(@Param("groupCode") groupCode: string) {
    return this.ticketPurchaseService.getGroupBookingDetails(groupCode);
  }

  @Get("group/:groupCode/tickets")
  @ApiOperation({
    summary: "Get all tickets in a group",
    description: "Retrieve all individual tickets within a group booking",
  })
  async getGroupTickets(@Param("groupCode") groupCode: string) {
    return this.ticketPurchaseService.getGroupTickets(groupCode);
  }

  @Put("group/ticket/:ticketId/transfer")
  @ApiOperation({
    summary: "Transfer a group ticket",
    description: "Transfer a group ticket to another user",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["transferToUserId"],
      properties: {
        transferToUserId: {
          type: "string",
          description: "ID of the user to transfer the ticket to",
        },
      },
    },
  })
  async transferGroupTicket(
    @Param("ticketId") ticketId: string,
    @Body("transferToUserId") transferToUserId: string,
    @Request() req,
  ) {
    return this.ticketPurchaseService.transferGroupTicket(
      ticketId,
      transferToUserId,
      req.user.id,
    );
  }

  @Put("group/ticket/:ticketId/assign")
  @ApiOperation({
    summary: "Assign a group ticket",
    description:
      "Assign a group ticket to a specific person (group leader only)",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["assignToName", "assignToEmail"],
      properties: {
        assignToName: {
          type: "string",
          description: "Name of the person to assign the ticket to",
        },
        assignToEmail: {
          type: "string",
          description: "Email of the person to assign the ticket to",
        },
      },
    },
  })
  async assignGroupTicket(
    @Param("ticketId") ticketId: string,
    @Body("assignToName") assignToName: string,
    @Body("assignToEmail") assignToEmail: string,
    @Request() req,
  ) {
    return this.ticketPurchaseService.assignGroupTicket(
      ticketId,
      assignToName,
      assignToEmail,
      req.user.id,
    );
  }

  @Get("my-groups")
  @ApiOperation({
    summary: "Get user's group bookings",
    description:
      "Retrieve all group bookings where the user is the group leader",
  })
  async getUserGroupBookings(@Request() req) {
    return this.ticketPurchaseService.getUserGroupBookings(req.user.id);
  }
}
