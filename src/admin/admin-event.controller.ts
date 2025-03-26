import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { UserRole } from "src/common/enums/users-roles.enum";
import { EventsService } from "src/events/events.service";
import { GetEventParamDto } from "./dto/get-event-param.dto";
import { ReportFilterDto } from "./dto/report-filter.dto";
import { AdminService } from "./providers/admin.service";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@RoleDecorator(UserRole.Admin)
export class AdminEventController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly adminService: AdminService,
  ) {}

  @Get("retrieve/all-event")
  async getAllEvents() {
    return this.eventsService.getAllEvents(1, 10, {}); // Provide default values for page, limit, and filters
  }

  @Get("retrieve/event/:id")
  async getEventById(@Param("id") getEventParamDto: GetEventParamDto) {
    return this.eventsService.getEventById(getEventParamDto.id);
  }

  @Get("reports")
  async generateReport(@Param() reportFilterDto: ReportFilterDto) {
    return this.adminService.generateReports(reportFilterDto);
  }

  @Post("archive/event")
  async archiveEvent(@Param("id") getEventParamDto: GetEventParamDto) {
    return this.eventsService.archiveEvent(getEventParamDto.id);
  }

  @Delete("delete/event/:id")
  async deleteEvent(@Param("id") getEventParamDto: GetEventParamDto) {
    return this.eventsService.deleteEvent(getEventParamDto.id);
  }
}
