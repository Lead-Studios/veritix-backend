import { ConfigService } from '@nestjs/config';
import { AdminService } from '../providers/admin.service';
declare const AdminJwtStrategy_base: new (...args: any) => any;
export declare class AdminJwtStrategy extends AdminJwtStrategy_base {
    private configService;
    private adminService;
    constructor(configService: ConfigService, adminService: AdminService);
    validate(payload: any): Promise<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        emailVerified: boolean;
        resetTokenExpiry: Date;
        verificationToken: string;
        verificationTokenExpiry: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
