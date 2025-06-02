import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { Roles } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";
import { SpecialGuestService } from "./special-guests.service";
import { CreateSpecialGuestDto } from "./dto/create-special-guest.dto";
import { UpdateSpecialGuestDto } from "./dto/update-special-guest.dto";

@ApiTags("Special Guests")
@ApiBearerAuth()
@Controller("special-guests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpecialGuestController {
  constructor(private readonly specialGuestService: SpecialGuestService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Create special guest",
    description: "Add a new special guest to an event",
  })
  @ApiBody({ type: CreateSpecialGuestDto })
  @ApiResponse({
    status: 201,
    description: "Special guest created successfully",
    type: CreateSpecialGuestDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  async createSpecialGuest(@Body() dto: CreateSpecialGuestDto) {
    return this.specialGuestService.createSpecialGuest(dto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all special guests",
    description: "Retrieve all special guests across all events",
  })
  @ApiResponse({
    status: 200,
    description: "List of all special guests",
    type: [CreateSpecialGuestDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAllSpecialGuests() {
    return this.specialGuestService.getAllSpecialGuests();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get special guest by ID",
    description: "Retrieve a specific special guest by their ID",
  })
  @ApiParam({
    name: "id",
    description: "ID of the special guest",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Special guest found",
    type: CreateSpecialGuestDto,
  })
  @ApiResponse({ status: 404, description: "Special guest not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSpecialGuestById(@Param("id") id: string) {
    return this.specialGuestService.getSpecialGuestById(id);
  }

  @Get("/event/:eventId")
  @ApiOperation({
    summary: "Get special guests by event",
    description: "Retrieve all special guests for a specific event",
  })
  @ApiParam({
    name: "eventId",
    description: "ID of the event",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "List of special guests for the event",
    type: [CreateSpecialGuestDto],
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSpecialGuestsByEvent(@Param("eventId") eventId: string) {
    return this.specialGuestService.getSpecialGuestsByEvent(eventId);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Update special guest",
    description: "Update details of an existing special guest",
  })
  @ApiParam({
    name: "id",
    description: "ID of the special guest to update",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({ type: UpdateSpecialGuestDto })
  @ApiResponse({
    status: 200,
    description: "Special guest updated successfully",
    type: CreateSpecialGuestDto,
  })
  @ApiResponse({ status: 404, description: "Special guest not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  async updateSpecialGuest(
    @Param("id") id: string,
    @Body() dto: UpdateSpecialGuestDto,
  ) {
    return this.specialGuestService.updateSpecialGuest(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Delete special guest",
    description: "Remove a special guest from the system",
  })
  @ApiParam({
    name: "id",
    description: "ID of the special guest to delete",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Special guest deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Special guest not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  async deleteSpecialGuest(@Param("id") id: string) {
    return this.specialGuestService.deleteSpecialGuest(id);
  }
}
