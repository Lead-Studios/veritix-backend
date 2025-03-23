import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private getErrorNameFromStatus;
}
