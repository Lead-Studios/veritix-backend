import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { CreateUsersProvider } from './providers/create-users-provider';
import { Repository } from 'typeorm';
import { FindOneByEmailProvider } from './providers/find-one-by-email.provider';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingProvider } from 'src/admin/providers/hashing-services';
import { ChangePasswordDto, ProfileImageDto, UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private userRepository;
    private readonly findOneByEmailProvider;
    private readonly createUserProvider;
    private hashingProvider;
    constructor(userRepository: Repository<User>, findOneByEmailProvider: FindOneByEmailProvider, createUserProvider: CreateUsersProvider, hashingProvider: HashingProvider);
    create(createUserDto: CreateUserDto): Promise<User>;
    GetOneByEmail(email: string): Promise<User>;
    findAll(page: number, limit: number): Promise<{
        total: number;
        page: number;
        limit: number;
        data: User[];
    }>;
    softDelete(id: number): Promise<{
        message: string;
    }>;
    findOneById(id: number): Promise<User | null>;
    remove(id: number): string;
    updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User | null>;
    findById(id: number): Promise<User>;
    updateProfile(id: number, updateData: UpdateProfileDto): Promise<User>;
    changePassword(id: number, dto: ChangePasswordDto): Promise<void>;
    updateProfileImage(id: number, dto: ProfileImageDto): Promise<User>;
}
