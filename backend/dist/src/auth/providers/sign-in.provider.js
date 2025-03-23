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
exports.SignInProvider = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../../users/users.service");
const hashing_provider_1 = require("./hashing-provider");
const generate_token_provider_1 = require("./generate-token.provider");
let SignInProvider = class SignInProvider {
    constructor(userServices, hashingProvider, generateTokensProvider) {
        this.userServices = userServices;
        this.hashingProvider = hashingProvider;
        this.generateTokensProvider = generateTokensProvider;
    }
    async SignIn(signInDto) {
        const user = await this.userServices.GetOneByEmail(signInDto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Email/Password is incorrect');
        }
        const account = user;
        if (!account) {
            throw new common_1.UnauthorizedException('No account found with this email');
        }
        let isEqual = false;
        try {
            isEqual = await this.hashingProvider.comparePassword(signInDto.password, user.password);
        }
        catch (error) {
            throw new common_1.RequestTimeoutException(error, {
                description: 'error connecting to the database',
            });
        }
        if (!isEqual) {
            throw new common_1.UnauthorizedException('Email/Password is incorrect');
        }
        const tokens = await this.generateTokensProvider.generateTokens(user);
        return [tokens, user];
    }
};
exports.SignInProvider = SignInProvider;
exports.SignInProvider = SignInProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        hashing_provider_1.HashingProvider,
        generate_token_provider_1.GenerateTokenProvider])
], SignInProvider);
//# sourceMappingURL=sign-in.provider.js.map