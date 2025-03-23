"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuthExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let AuthExceptionFilter = AuthExceptionFilter_1 = class AuthExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(AuthExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (0, crypto_1.randomUUID)();
        const statusCode = exception.getStatus();
        let message;
        let error;
        if (exception instanceof common_1.UnauthorizedException) {
            message = 'Authentication required';
            error = 'Unauthorized';
        }
        else {
            message = 'Access denied';
            error = 'Forbidden';
        }
        const exceptionResponse = exception.getResponse();
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            if (exceptionResponse.message) {
                message = exceptionResponse.message;
            }
        }
        const errorResponse = {
            statusCode,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
        };
        this.logger.error(`${requestId} - ${error}: ${request.method} ${request.url} - ${message}`);
        response.status(statusCode).json(errorResponse);
    }
};
exports.AuthExceptionFilter = AuthExceptionFilter;
exports.AuthExceptionFilter = AuthExceptionFilter = AuthExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.UnauthorizedException, common_1.ForbiddenException)
], AuthExceptionFilter);
//# sourceMappingURL=auth-exception.filter.js.map