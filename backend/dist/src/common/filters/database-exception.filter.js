"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DatabaseExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const typeorm_1 = require("typeorm");
const exceptions_1 = require("../exceptions");
let DatabaseExceptionFilter = DatabaseExceptionFilter_1 = class DatabaseExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(DatabaseExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (0, crypto_1.randomUUID)();
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Database operation failed';
        let errorCode = null;
        if (exception instanceof typeorm_1.QueryFailedError) {
            statusCode = common_1.HttpStatus.BAD_REQUEST;
            if (exception.code === '23505') {
                message = 'Duplicate entry found';
                errorCode = 'UNIQUE_VIOLATION';
            }
            else if (exception.code === '23503') {
                message = 'Referenced resource not found';
                errorCode = 'FOREIGN_KEY_VIOLATION';
            }
        }
        else if (exception instanceof typeorm_1.EntityNotFoundError) {
            statusCode = common_1.HttpStatus.NOT_FOUND;
            message = 'Resource not found';
            errorCode = 'ENTITY_NOT_FOUND';
        }
        else if (exception instanceof exceptions_1.DatabaseException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                message = exceptionResponse.message || message;
            }
        }
        const errorResponse = {
            statusCode,
            message,
            error: 'Database Error',
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
        };
        if (errorCode) {
            errorResponse.errorCode = errorCode;
        }
        this.logger.error(`${requestId} - Database Error: ${request.method} ${request.url} - ${message}`, exception instanceof Error ? exception.stack : '');
        response.status(statusCode).json(errorResponse);
    }
};
exports.DatabaseExceptionFilter = DatabaseExceptionFilter;
exports.DatabaseExceptionFilter = DatabaseExceptionFilter = DatabaseExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(typeorm_1.QueryFailedError, typeorm_1.EntityNotFoundError, exceptions_1.DatabaseException)
], DatabaseExceptionFilter);
//# sourceMappingURL=database-exception.filter.js.map