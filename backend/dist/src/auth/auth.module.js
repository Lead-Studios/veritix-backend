"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./providers/auth.service");
const auth_controller_1 = require("./auth.controller");
const hashing_provider_1 = require("./providers/hashing-provider");
const bcrypt_provider_1 = require("./providers/bcrypt-provider");
const users_module_1 = require("../users/users.module");
const sign_in_provider_1 = require("./providers/sign-in.provider");
const generate_token_provider_1 = require("./providers/generate-token.provider");
const jwt_config_1 = require("../../config/jwt.config");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const refresh_token_provider_1 = require("./providers/refresh-token.provider");
const passport_1 = require("@nestjs/passport");
const jwt_strategy_1 = require("../../security/strategies/jwt.strategy");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            config_1.ConfigModule.forFeature(jwt_config_1.default),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'yourSecretKey',
                signOptions: { expiresIn: '1h' },
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            {
                provide: hashing_provider_1.HashingProvider,
                useClass: bcrypt_provider_1.BcryptProvider,
            },
            sign_in_provider_1.SignInProvider,
            generate_token_provider_1.GenerateTokenProvider,
            refresh_token_provider_1.RefreshTokenProvider,
        ],
        exports: [
            auth_service_1.AuthService,
            hashing_provider_1.HashingProvider,
            passport_1.PassportModule,
            jwt_1.JwtModule,
            jwt_strategy_1.JwtStrategy,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map