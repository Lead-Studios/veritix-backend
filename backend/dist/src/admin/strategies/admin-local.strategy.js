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
exports.AdminLocalStrategy = void 0;
const passport_local_1 = require("passport-local");
const passport_1 = require("@nestjs/passport");
const common_1 = require("@nestjs/common");
const admin_auth_services_1 = require("../providers/admin-auth.services");
let AdminLocalStrategy = class AdminLocalStrategy extends (0, passport_1.PassportStrategy)(passport_local_1.Strategy, 'admin-local') {
    constructor(adminAuthService) {
        super({ usernameField: 'email' });
        this.adminAuthService = adminAuthService;
    }
    async validate(email, password) {
        const admin = await this.adminAuthService.validateAdmin(email, password);
        if (!admin) {
            throw new common_1.UnauthorizedException();
        }
        const { password: _, refreshToken, resetToken, ...result } = admin;
        return result;
    }
};
exports.AdminLocalStrategy = AdminLocalStrategy;
exports.AdminLocalStrategy = AdminLocalStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_auth_services_1.AdminAuthService])
], AdminLocalStrategy);
//# sourceMappingURL=admin-local.strategy.js.map