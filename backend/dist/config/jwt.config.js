"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('jwt', () => ({
    secret: process.env.JWT_SECRET || 'your_default_secret',
    audience: process.env.JWT_TOKEN_AUDIENCE || 'your_audience',
    issuer: process.env.JWT_TOKEN_ISSUER || 'your_issuer',
    expiresIn: process.env.JWT_EXPIRATION || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_TOKEN_TTL || '90d',
}));
//# sourceMappingURL=jwt.config.js.map