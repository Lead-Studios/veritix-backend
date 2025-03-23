import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    [x: string]: any;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<import("./entities/user.entity").User>;
    findAll(page?: number, limit?: number): Promise<{
        total: number;
        page: number;
        limit: number;
        data: import("./entities/user.entity").User[];
    }>;
    softDelete(id: number): Promise<{
        message: string;
    }>;
    findOne(id: string): Promise<import("./entities/user.entity").User>;
    remove(id: string): string;
    updateUser(updateUserDto: UpdateUserDto, id: number): Promise<import("./entities/user.entity").User>;
    getDetails(req: {
        user: {
            userId: number;
        };
    }): Promise<import("./entities/user.entity").User>;
    updateProfile(req: {
        user: {
            userId: number;
        };
    }, dto: UpdateProfileDto): Promise<import("./entities/user.entity").User>;
    changePassword(req: {
        user: {
            userId: number;
        };
    }, dto: ChangePasswordDto): Promise<void>;
    uploadProfileImage(req: {
        user: {
            userId: number;
        };
    }, file: any): Promise<import("./entities/user.entity").User>;
}
