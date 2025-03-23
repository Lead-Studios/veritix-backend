"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ValidationExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const exceptions_1 = require("../exceptions");
let ValidationExceptionFilter = ValidationExceptionFilter_1 = class ValidationExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(ValidationExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (0, crypto_1.randomUUID)();
        const statusCode = exception.getStatus();
        let message = 'Validation failed';
        let validationErrors = [];
        const exceptionResponse = exception.getResponse();
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            message = exceptionResponse.message || message;
            if (Array.isArray(exceptionResponse.message)) {
                validationErrors = exceptionResponse.message;
                message = 'Validation failed';
            }
            if (exceptionResponse.errors) {
                validationErrors = exceptionResponse.errors;
            }
        }
        const errorResponse = {
            statusCode,
            message,
            error: 'Validation Error',
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
        };
        if (validationErrors.length > 0) {
            errorResponse.validationErrors = validationErrors;
        }
        this.logger.error(`${requestId} - Validation Error: ${request.method} ${request.url}`, JSON.stringify(errorResponse));
        response.status(statusCode).json(errorResponse);
    }
};
exports.ValidationExceptionFilter = ValidationExceptionFilter;
exports.ValidationExceptionFilter = ValidationExceptionFilter = ValidationExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.BadRequestException, exceptions_1.ValidationException)
], ValidationExceptionFilter);
//# sourceMappingURL=validation-exception.filter.js.map