import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { DatabaseException } from '../exceptions';
export declare class DatabaseExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: QueryFailedError | EntityNotFoundError | DatabaseException, host: ArgumentsHost): void;
}
