"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainException = exports.DatabaseException = exports.SessionException = exports.ValidationException = void 0;
const common_1 = require("@nestjs/common");
class ValidationException extends common_1.HttpException {
    constructor(message, errors) {
        super({
            message,
            errors,
        }, common_1.HttpStatus.BAD_REQUEST);
    }
}
exports.ValidationException = ValidationException;
class SessionException extends common_1.HttpException {
    constructor(message = 'Session expired') {
        super({
            message,
        }, common_1.HttpStatus.FORBIDDEN);
    }
}
exports.SessionException = SessionException;
class DatabaseException extends common_1.HttpException {
    constructor(message, statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
        super({
            message,
        }, statusCode);
    }
}
exports.DatabaseException = DatabaseException;
class BlockchainException extends common_1.HttpException {
    constructor(message) {
        super({
            message,
        }, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
exports.BlockchainException = BlockchainException;
//# sourceMappingURL=index.js.map