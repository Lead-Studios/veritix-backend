import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { ContactUsService } from "./contact-us.service";
import { CreateContactUsDto } from "./dto/create-contact-us.dto";
import { UpdateContactUsDto } from "./dto/update-contact-us.dto";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { Roles } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";

@ApiTags("Contact Us")
@Controller("contact-us")
export class ContactUsController {
  constructor(private readonly contactUsService: ContactUsService) {}

  @Post()
  @ApiOperation({
    summary: "Submit contact form",
    description: "Submit a new contact form message",
  })
  @ApiResponse({
    status: 201,
    description: "Message submitted successfully",
    type: CreateContactUsDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  create(@Body() createContactUsDto: CreateContactUsDto) {
    return this.contactUsService.create(createContactUsDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get all messages",
    description: "Retrieve all contact form messages",
  })
  @ApiResponse({
    status: 200,
    description: "List of all contact messages",
    type: [CreateContactUsDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  findAll() {
    return this.contactUsService.findAll();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get message by ID",
    description: "Retrieve a specific contact message by ID",
  })
  @ApiParam({
    name: "id",
    description: "Contact message ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Contact message found",
    type: CreateContactUsDto,
  })
  @ApiResponse({ status: 404, description: "Message not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  findOne(@Param("id") id: string) {
    return this.contactUsService.findOne(id);
  }

  // @Patch(":id")
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  // @ApiBearerAuth()
  // @ApiOperation({
  //   summary: "Update message",
  //   description: "Update a contact message status or add notes",
  // })
  // @ApiParam({
  //   name: "id",
  //   description: "Contact message ID",
  //   example: "123e4567-e89b-12d3-a456-426614174000",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Message updated successfully",
  //   type: CreateContactUsDto,
  // })
  // @ApiResponse({ status: 404, description: "Message not found" })
  // @ApiResponse({ status: 401, description: "Unauthorized" })
  // @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  // update(
  //   @Param("id") id: string,
  //   @Body() updateContactUsDto: UpdateContactUsDto,
  // ) {
  //   return this.contactUsService.update(id, updateContactUsDto);
  // }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete message",
    description: "Delete a contact message",
  })
  @ApiParam({
    name: "id",
    description: "Contact message ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({ status: 200, description: "Message deleted successfully" })
  @ApiResponse({ status: 404, description: "Message not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  remove(@Param("id") id: string) {
    return this.contactUsService.remove(id);
  }
}
