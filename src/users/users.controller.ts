import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  NotFoundException,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Controller("users")
export class UsersController {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly usersService: UsersService
  ) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /users?limit=10&page=1
  @Get()
  public async findAll(pagination?: {
    limits: number;
    page: number;
  }): Promise<{ users: CreateUserDto[]; total: number }> {
    // set default limits and page we want
    const { limits = 20, page = 1 } = pagination || {};

    const [users, total] = await this.usersRepository.findAndCount({
      take: limits,
      skip: (page - 1) * limits,
    });
    return { users: users, total };
  }

  // DELETE /users/:id
  @Delete(":id")
  async softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.softDelete(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOneById(+id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(+id);
  }

  /**Patch endpoint */
  @Patch(":id")
  public async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);

    /**if user does not exist */
    if (!user) {
      throw new NotFoundException("No user was found");
    }
    return user;
  }
}
