import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { SessionException } from '../exceptions';
export declare class SessionExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: SessionException, host: ArgumentsHost): void;
}
