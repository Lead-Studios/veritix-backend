"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (0, crypto_1.randomUUID)();
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                message = exceptionResponse.message || message;
                error =
                    exceptionResponse.error ||
                        this.getErrorNameFromStatus(statusCode);
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
        this.logger.error(`${requestId} - ${request.method} ${request.url} - ${statusCode} - ${message}`, exception instanceof Error ? exception.stack : '');
        response.status(statusCode).json(errorResponse);
    }
    getErrorNameFromStatus(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'Bad Request';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'Unauthorized';
            case common_1.HttpStatus.FORBIDDEN:
                return 'Forbidden';
            case common_1.HttpStatus.NOT_FOUND:
                return 'Not Found';
            case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
                return 'Unprocessable Entity';
            default:
                return 'Internal Server Error';
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map