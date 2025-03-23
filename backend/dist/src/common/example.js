"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SomeService = void 0;
const common_1 = require("@nestjs/common");
const exceptions_1 = require("./exceptions");
let SomeService = class SomeService {
    async performDatabaseOperation() {
        try {
        }
        catch (error) {
            if (error.code === '23505') {
                throw new exceptions_1.DatabaseException('A record with the same ID already exists', common_1.HttpStatus.CONFLICT);
            }
            throw new exceptions_1.DatabaseException('Failed to perform database operation');
        }
    }
    async executeBlockchainTransaction() {
        try {
        }
        catch (error) {
            throw new exceptions_1.BlockchainException('Smart contract execution failed');
        }
    }
    async validateSession(sessionId) {
        const isValid = false;
        if (!isValid) {
            throw new exceptions_1.SessionException('Your session has expired, please log in again');
        }
    }
};
exports.SomeService = SomeService;
exports.SomeService = SomeService = __decorate([
    (0, common_1.Injectable)()
], SomeService);
//# sourceMappingURL=example.js.map