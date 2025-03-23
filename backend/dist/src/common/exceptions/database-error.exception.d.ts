import { HttpException } from '@nestjs/common';
export declare class DatabaseErrorException extends HttpException {
    constructor(message: string);
}
