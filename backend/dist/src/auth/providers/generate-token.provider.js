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
exports.GenerateTokenProvider = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const jwt_config_1 = require("../../../config/jwt.config");
let GenerateTokenProvider = class GenerateTokenProvider {
    constructor(jwtService, jwtConfiguration) {
        this.jwtService = jwtService;
        this.jwtConfiguration = jwtConfiguration;
    }
    async SignToken(userId, expiresIn, payload) {
        return await this.jwtService.signAsync({
            sub: userId,
            ...payload,
        }, {
            secret: this.jwtConfiguration.secret,
            audience: this.jwtConfiguration.audience,
            issuer: this.jwtConfiguration.issuer,
            expiresIn,
        });
    }
    async generateTokens(user) {
        const [access_token, refresh_token] = await Promise.all([
            this.SignToken(user.id, this.jwtConfiguration.expiresIn, {
                email: user.email,
            }),
            this.SignToken(user.id, this.jwtConfiguration.refreshExpiresIn),
        ]);
        return { access_token, refresh_token };
    }
};
exports.GenerateTokenProvider = GenerateTokenProvider;
exports.GenerateTokenProvider = GenerateTokenProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(jwt_config_1.default.KEY)),
    __metadata("design:paramtypes", [jwt_1.JwtService, void 0])
], GenerateTokenProvider);
//# sourceMappingURL=generate-token.provider.js.map