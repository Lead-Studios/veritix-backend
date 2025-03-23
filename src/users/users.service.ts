/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
<<<<<<< HEAD:src/users/users.service.ts
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
// import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { CreateUsersProvider } from "./providers/create-users-provider";
import { Repository } from "typeorm";
import { FindOneByEmailProvider } from "./providers/find-one-by-email.provider";
import { UpdateUserDto } from "./dto/update-user.dto";
=======
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreateUsersProvider } from './providers/create-users-provider';
import { Repository } from 'typeorm';
import { FindOneByEmailProvider } from './providers/find-one-by-email.provider';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingProvider } from 'src/admin/providers/hashing-services';
import { ChangePasswordDto, ProfileImageDto, UpdateProfileDto } from './dto/update-profile.dto';
>>>>>>> 79d2cfe (feat: Implement User Profile Management\n Fix: issues with jwt must be a string or number):backend/src/users/users.service.ts

@Injectable()
export class UsersService {
  constructor(
    /*
     * inject create user provider
     */
    @InjectRepository(User)
    private userRepository: Repository<User>,

    private readonly findOneByEmailProvider: FindOneByEmailProvider,

    private readonly createUserProvider: CreateUsersProvider,

    private hashingProvider: HashingProvider, // Inject the HashingProvider for password hashing

    // @Inject(forwardRef(() => AuthService))
    // private readonly authService: AuthService,
  ) {}

  create(createUserDto: CreateUserDto) {
    return this.createUserProvider.createUser(createUserDto);
  }

  public async GetOneByEmail(email: string) {
    return await this.findOneByEmailProvider.FindByEmail(email);
  }

  // Find all users with pagination
  async findAll(page: number, limit: number) {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: "ASC" },
    });

    return {
      total,
      page,
      limit,
      data: users,
    };
  }

  // Soft delete a user by ID
  async softDelete(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.softDelete(id);
    return { message: `User with ID ${id} has been deleted.` };
  }

  public async findOneById(id: number): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  public async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }

    // Check if email is unique before updating
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException("Please check your email id");
      }
    }

    // Ensure only specified fields are updated, excluding id
    const allowedUpdates = ["name", "email"];
    for (const key of Object.keys(updateUserDto)) {
      if (allowedUpdates.includes(key)) {
        (user as any)[key] = (updateUserDto as any)[key];
      }
    }

    return this.userRepository.save(user);
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateProfile(id: number, updateData: UpdateProfileDto): Promise<User> {

    const allowedUpdates = {
      userName: updateData.userName,
      email: updateData.email,
    };

    await this.userRepository.update(id, allowedUpdates);
    return this.findById(id);
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findById(id);
    const isValidPassword = await this.hashingProvider.comparePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isValidPassword) throw new UnauthorizedException('Invalid current password');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashedPassword = await this.hashingProvider.hashPassword(dto.newPassword);
    await this.userRepository.update(id, { password: hashedPassword });
  }

  async updateProfileImage(id: number, dto: ProfileImageDto): Promise<User> {
    await this.userRepository.update(id, { profileImageUrl: dto.imageUrl });
    return this.findById(id);
  }
}
