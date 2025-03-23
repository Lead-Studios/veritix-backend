import { AdminAuthService } from './providers/admin-auth.services';
export declare class AdminAuthController {
    private adminAuthService;
    constructor(adminAuthService: AdminAuthService);
    login(req: any): Promise<{
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
    sendVerification(req: any): Promise<{
        message: string;
    }>;
    verifyEmail(email: string, token: string): Promise<{
        message: string;
    }>;
    getProfile(req: any): any;
}
