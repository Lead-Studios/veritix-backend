import { ExceptionFilter, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ValidationException } from '../exceptions';
export declare class ValidationExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: BadRequestException | ValidationException, host: ArgumentsHost): void;
}
