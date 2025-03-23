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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const sign_in_provider_1 = require("./sign-in.provider");
const refresh_token_provider_1 = require("./refresh-token.provider");
const users_service_1 = require("../../users/users.service");
let AuthService = class AuthService {
    constructor(usersService, signInProvider, refreshTokenProvider) {
        this.usersService = usersService;
        this.signInProvider = signInProvider;
        this.refreshTokenProvider = refreshTokenProvider;
    }
    async SignIn(signInDto) {
        return await this.signInProvider.SignIn(signInDto);
    }
    async refreshToken(refreshTokenDto) {
        return await this.refreshTokenProvider.refreshToken(refreshTokenDto);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        sign_in_provider_1.SignInProvider,
        refresh_token_provider_1.RefreshTokenProvider])
], AuthService);
//# sourceMappingURL=auth.service.js.map