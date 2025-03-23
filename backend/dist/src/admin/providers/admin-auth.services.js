"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const admin_service_1 = require("./admin.service");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
const hashing_services_1 = require("./hashing-services");
let AdminAuthService = class AdminAuthService {
    constructor(adminService, jwtService, configService, hashingProvider) {
        this.adminService = adminService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.hashingProvider = hashingProvider;
    }
    async validateAdmin(email, password) {
        const admin = await this.adminService.findOneByEmail(email);
        if (!admin) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!admin.emailVerified) {
            throw new common_1.UnauthorizedException('Email not verified');
        }
        const isPasswordValid = await this.hashingProvider.comparePassword(password, admin.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return admin;
    }
    async login(admin) {
        const payload = { email: admin.email, sub: admin.id, role: 'admin' };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_ADMIN_REFRESH_EXPIRATION', '7d'),
            secret: this.configService.get('JWT_ADMIN_REFRESH_SECRET'),
        });
        const refreshTokenHash = await this.hashingProvider.hashPassword(refreshToken);
        await this.adminService.setRefreshToken(admin.id, refreshTokenHash);
        return {
            accessToken,
            refreshToken,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_ADMIN_REFRESH_SECRET'),
            });
            const admin = await this.adminService.findOneById(payload.sub);
            if (!admin || !admin.refreshToken) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const isRefreshTokenValid = await this.hashingProvider.comparePassword(refreshToken, admin.refreshToken);
            if (!isRefreshTokenValid) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const newPayload = { email: admin.email, sub: admin.id, role: 'admin' };
            return {
                accessToken: this.jwtService.sign(newPayload),
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async forgotPassword(email) {
        const admin = await this.adminService.findOneByEmail(email);
        if (!admin) {
            return {
                message: 'If your email is registered, you will receive a password reset link',
            };
        }
        const resetToken = (0, uuid_1.v4)();
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);
        const resetTokenHash = await this.hashingProvider.hashPassword(resetToken);
        await this.adminService.setResetToken(admin.id, resetTokenHash, resetTokenExpiry);
        return {
            message: 'If your email is registered, you will receive a password reset link',
        };
    }
    async resetPassword(email, token, newPassword) {
        const admin = await this.adminService.findOneByEmail(email);
        if (!admin || !admin.resetToken || !admin.resetTokenExpiry) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        if (new Date() > admin.resetTokenExpiry) {
            throw new common_1.BadRequestException('Reset token has expired');
        }
        const isTokenValid = await this.hashingProvider.comparePassword(token, admin.resetToken);
        if (!isTokenValid) {
            throw new common_1.BadRequestException('Invalid reset token');
        }
        const hashedPassword = await this.hashingProvider.hashPassword(newPassword);
        await this.adminService.updatePassword(admin.id, hashedPassword);
        return { message: 'Password updated successfully' };
    }
    async sendVerificationEmail(adminId) {
        const admin = await this.adminService.findOneById(adminId);
        if (!admin) {
            throw new common_1.NotFoundException('Admin not found');
        }
        const verificationToken = (0, uuid_1.v4)();
        const tokenHash = await this.hashingProvider.hashPassword(verificationToken);
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);
        await this.adminService.setVerificationToken(admin.id, tokenHash, tokenExpiry);
        return { message: 'Verification email sent' };
    }
    async verifyEmail(email, token) {
        const admin = await this.adminService.findOneByEmail(email);
        if (!admin || !admin.verificationToken || !admin.verificationTokenExpiry) {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
        if (new Date() > admin.verificationTokenExpiry) {
            throw new common_1.BadRequestException('Verification token has expired');
        }
        const isTokenValid = await this.hashingProvider.comparePassword(token, admin.verificationToken);
        if (!isTokenValid) {
            throw new common_1.BadRequestException('Invalid verification token');
        }
        await this.adminService.verifyEmail(admin.id);
        return { message: 'Email verified successfully' };
    }
};
exports.AdminAuthService = AdminAuthService;
exports.AdminAuthService = AdminAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        jwt_1.JwtService,
        config_1.ConfigService,
        hashing_services_1.HashingProvider])
], AdminAuthService);
//# sourceMappingURL=admin-auth.services.js.map