"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SessionExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const exceptions_1 = require("../exceptions");
let SessionExceptionFilter = SessionExceptionFilter_1 = class SessionExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(SessionExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (0, crypto_1.randomUUID)();
        const statusCode = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        let message = 'Session expired';
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            message = exceptionResponse.message || message;
        }
        const errorResponse = {
            statusCode,
            message,
            error: 'Session Error',
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
        };
        this.logger.error(`${requestId} - Session Error: ${request.method} ${request.url} - ${message}`);
        response.status(statusCode).json(errorResponse);
    }
};
exports.SessionExceptionFilter = SessionExceptionFilter;
exports.SessionExceptionFilter = SessionExceptionFilter = SessionExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(exceptions_1.SessionException)
], SessionExceptionFilter);
//# sourceMappingURL=session-exception.filter.js.map