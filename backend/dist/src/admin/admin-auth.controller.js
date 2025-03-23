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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const admin_jwt_auth_guard_1 = require("./guards/admin-jwt-auth.guard");
const admin_local_auth_guard_1 = require("./guards/admin-local-auth.guard");
const admin_auth_services_1 = require("./providers/admin-auth.services");
let AdminAuthController = class AdminAuthController {
    constructor(adminAuthService) {
        this.adminAuthService = adminAuthService;
    }
    async login(req) {
        return this.adminAuthService.login(req.user);
    }
    async refreshToken(refreshToken) {
        return this.adminAuthService.refreshToken(refreshToken);
    }
    async forgotPassword(email) {
        return this.adminAuthService.forgotPassword(email);
    }
    async resetPassword(email, token, newPassword) {
        return this.adminAuthService.resetPassword(email, token, newPassword);
    }
    async sendVerification(req) {
        return this.adminAuthService.sendVerificationEmail(req.user.id);
    }
    async verifyEmail(email, token) {
        return this.adminAuthService.verifyEmail(email, token);
    }
    getProfile(req) {
        return req.user;
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.UseGuards)(admin_local_auth_guard_1.AdminLocalAuthGuard),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh-token'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('token')),
    __param(2, (0, common_1.Body)('newPassword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('send-verification'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "sendVerification", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAuthController.prototype, "getProfile", null);
exports.AdminAuthController = AdminAuthController = __decorate([
    (0, common_1.Controller)('admin/auth'),
    __metadata("design:paramtypes", [admin_auth_services_1.AdminAuthService])
], AdminAuthController);
//# sourceMappingURL=admin-auth.controller.js.map