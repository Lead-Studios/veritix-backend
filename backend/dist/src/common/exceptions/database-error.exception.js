"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseErrorException = void 0;
const common_1 = require("@nestjs/common");
class DatabaseErrorException extends common_1.HttpException {
    constructor(message) {
        super(message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
exports.DatabaseErrorException = DatabaseErrorException;
//# sourceMappingURL=database-error.exception.js.map