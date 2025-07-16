import { Controller, Get, Post, Patch, Param, Delete, UseGuards, Request } from "@nestjs/common"
import { UsersService } from "./users.service"
import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { RolesGuard } from "../rbac/guards/roles.guard"
import { Roles } from "../rbac/decorators/roles.decorator"
import { Role } from "../rbac/enums/role.enum"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard" // Assuming you have JWT auth

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Get()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  findAll() {
    return this.usersService.findAll()
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ORGANIZER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto)
  }

  @Patch(":id/roles")
  @Roles(Role.ADMIN)
  updateRoles(@Param('id') id: string, roles: { roles: Role[] }) {
    return this.usersService.updateRoles(id, roles.roles)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
