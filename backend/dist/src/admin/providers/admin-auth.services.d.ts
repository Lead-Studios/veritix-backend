import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';
import { HashingProvider } from './hashing-services';
export declare class AdminAuthService {
    private readonly adminService;
    private readonly jwtService;
    private readonly configService;
    private readonly hashingProvider;
    constructor(adminService: AdminService, jwtService: JwtService, configService: ConfigService, hashingProvider: HashingProvider);
    validateAdmin(email: string, password: string): Promise<import("../entities/admin.entity").Admin>;
    login(admin: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(email: string, token: string, newPassword: string): Promise<{
        message: string;
    }>;
    sendVerificationEmail(adminId: number): Promise<{
        message: string;
    }>;
    verifyEmail(email: string, token: string): Promise<{
        message: string;
    }>;
}
