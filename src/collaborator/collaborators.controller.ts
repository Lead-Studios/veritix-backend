import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { CollaboratorsService } from "./collaborators.service";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from "../../security/decorators/roles.decorator";
import { UserRole } from "../common/enums/users-roles.enum";

@Controller("collaborators")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Post()
  @RoleDecorator(UserRole.Admin)
  create(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorsService.create(createCollaboratorDto);
  }

  @Get()
  findAll() {
    return this.collaboratorsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.collaboratorsService.findOne(id);
  }

  @Get("event/:eventId")
  findByEvent(@Param("eventId") eventId: string) {
    return this.collaboratorsService.findByEvent(eventId);
  }

  @Put(":id")
  @RoleDecorator(UserRole.Admin)
  update(
    @Param("id") id: string,
    @Body() updateCollaboratorDto: Partial<CreateCollaboratorDto>,
  ) {
    return this.collaboratorsService.update(id, updateCollaboratorDto);
  }

  @Delete(":id")
  @RoleDecorator(UserRole.Admin)
  remove(@Param("id") id: string) {
    return this.collaboratorsService.remove(id);
  }
}
