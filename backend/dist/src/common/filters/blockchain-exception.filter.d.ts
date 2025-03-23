import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { BlockchainException } from '../exceptions';
export declare class BlockchainExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: BlockchainException, host: ArgumentsHost): void;
}
