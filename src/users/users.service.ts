/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
  Logger,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
// import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { CreateUsersProvider } from "./providers/create-users-provider";
import { Repository } from "typeorm";
import { FindOneByEmailProvider } from "./providers/find-one-by-email.provider";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AuthService } from "src/auth/providers/auth.service";
import { HashingProvider } from 'src/admin/providers/hashing-services';
import { ChangePasswordDto, ProfileImageDto, UpdateProfileDto } from './dto/update-profile.dto';

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

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,

    private hashingProvider: HashingProvider, // Inject the HashingProvider for password hashing
  ) {}
  private readonly logger = new Logger(UsersService.name);

 

  public async create(
    createUserDto: CreateUserDto,
  ): Promise<{ message: string; user: CreateUserDto, token: string }> {
    const { user, token } = await this.createUserProvider.createUser(createUserDto);
    this.logger.log(`User created: ${JSON.stringify(user, null, 2)}`);
    return {
      message: 'A new user has been created successfully',
      user: user, 
      token: token,
    };
  }

  public async GetOneByEmail(email: string) {
    const user = await this.findOneByEmailProvider.FindByEmail(email);
    if (!user) {
      this.logger.warn(`User with email ${email} not found`);
      throw new NotFoundException(`User with email ${email} not found`);
    }
    this.logger.log(`User found: ${JSON.stringify(user, null, 2)}`);
    return user;
  }

  // Find all users with pagination
  public async findAll(page: number, limit: number) {
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

  public async findOneById(id: number): Promise<User> {
    // Double-check ID validity
    if (typeof id !== 'number' || isNaN(id) || id <= 0) {
      throw new NotFoundException(`Invalid user ID: ${id}`);
    }
    
    const user = await this.userRepository.findOneBy({ id });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
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
    internalFields?: Partial<Pick<User, "isVerified">>,
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
    const allowedUpdates = ["name", "email", "userName"];
    for (const key of Object.keys(updateUserDto)) {
      if (allowedUpdates.includes(key)) {
        (user as any)[key] = (updateUserDto as any)[key];
      }
    }

    // Handle internal fields if provided
    if (internalFields && internalFields.isVerified !== undefined) {
      // check if user has been verified
      if (!user.isVerified) {
        user.isVerified = internalFields.isVerified;
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

    try {
      await this.userRepository.update(id, allowedUpdates);
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`);
      throw new BadRequestException('Failed to update user');
    }
    this.logger.log(`User updated: ${JSON.stringify(allowedUpdates, null, 2)}`);
    return this.findById(id);
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
  ): Promise<string> {
    const user = await this.findById(id);
    const isValidPassword = await this.hashingProvider.comparePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isValidPassword) throw new BadRequestException('Invalid current password');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashedPassword = await this.hashingProvider.hashPassword(dto.newPassword);
    await this.userRepository.update(id, { password: hashedPassword });
    return (await this.findById(id)).password;
  }

  async updateProfileImage(id: number, dto: ProfileImageDto): Promise<User> {
    await this.userRepository.update(id, { profileImageUrl: dto.imageUrl });
    return this.findById(id);
  }
}
