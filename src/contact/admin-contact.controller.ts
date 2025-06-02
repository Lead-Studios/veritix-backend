import { Controller, Get, Delete, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { ContactService } from "./contact.service";
import { UserRole } from "src/common/enums/users-roles.enum";
import { Roles } from "security/decorators/roles.decorator";

@Controller("admin/contact-messages")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  async findAll() {
    return await this.contactService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.contactService.findOne(id);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.contactService.remove(id);
    return { message: "Contact message deleted successfully." };
  }
}
