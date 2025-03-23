"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const admin_service_1 = require("./providers/admin.service");
const admin_controller_1 = require("./admin.controller");
const admin_auth_controller_1 = require("./admin-auth.controller");
const admin_jwt_strategy_1 = require("./strategies/admin-jwt.strategy");
const admin_local_strategy_1 = require("./strategies/admin-local.strategy");
const admin_entity_1 = require("./entities/admin.entity");
const admin_auth_services_1 = require("./providers/admin-auth.services");
const bcrpt_provider_1 = require("./providers/bcrpt-provider");
const hashing_services_1 = require("./providers/hashing-services");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([admin_entity_1.Admin]),
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_ADMIN_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_ADMIN_EXPIRATION', '15m'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [admin_controller_1.AdminController, admin_auth_controller_1.AdminAuthController],
        providers: [
            admin_service_1.AdminService,
            admin_auth_services_1.AdminAuthService,
            admin_jwt_strategy_1.AdminJwtStrategy,
            admin_local_strategy_1.AdminLocalStrategy,
            {
                provide: hashing_services_1.HashingProvider,
                useClass: bcrpt_provider_1.BcryptProvider,
            },
        ],
        exports: [admin_service_1.AdminService, admin_auth_services_1.AdminAuthService, hashing_services_1.HashingProvider],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map