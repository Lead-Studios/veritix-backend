import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
export declare class AdminService {
    private readonly adminRepository;
    constructor(adminRepository: Repository<Admin>);
    createAdmin(createAdminDto: CreateAdminDto): Promise<{
        message: string;
        adminId: number;
    }>;
    findAll(): Promise<Partial<Admin>[]>;
    findOne(id: number): Promise<Partial<Admin>>;
    findOneByEmail(email: string): Promise<Admin | undefined>;
    findOneById(id: number): Promise<Admin | undefined>;
    update(id: number, updateAdminDto: UpdateAdminDto): Promise<{
        message: string;
        adminId: number;
    }>;
    remove(id: number): Promise<{
        message: string;
        adminId: number;
    }>;
    setRefreshToken(id: number, refreshToken: string): Promise<void>;
    setResetToken(id: number, resetToken: string, resetTokenExpiry: Date): Promise<void>;
    updatePassword(id: number, password: string): Promise<void>;
    setVerificationToken(id: number, verificationToken: string, verificationTokenExpiry: Date): Promise<void>;
    verifyEmail(id: number): Promise<void>;
}
