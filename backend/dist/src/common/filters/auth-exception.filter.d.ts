import { ExceptionFilter, ArgumentsHost, UnauthorizedException, ForbiddenException } from '@nestjs/common';
export declare class AuthExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: UnauthorizedException | ForbiddenException, host: ArgumentsHost): void;
}
