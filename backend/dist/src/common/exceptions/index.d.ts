import { HttpException, HttpStatus } from '@nestjs/common';
export declare class ValidationException extends HttpException {
    constructor(message: string, errors?: any);
}
export declare class SessionException extends HttpException {
    constructor(message?: string);
}
export declare class DatabaseException extends HttpException {
    constructor(message: string, statusCode?: HttpStatus);
}
export declare class BlockchainException extends HttpException {
    constructor(message: string);
}
