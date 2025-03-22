import { ExceptionFilter, Catch, ArgumentsHost, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { BlockchainException } from "../exceptions";

@Catch(BlockchainException)
export class BlockchainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BlockchainExceptionFilter.name);

  catch(exception: BlockchainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = randomUUID();
    const statusCode = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let message = "Blockchain transaction failed";
    let transactionHash: string | null = null;
    let blockchainError: string | null = null;

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      message = (exceptionResponse as any).message || message;

      // Capture blockchain-specific details if available
      if ((exceptionResponse as any).transactionHash) {
        transactionHash = (exceptionResponse as any).transactionHash;
      }

      if ((exceptionResponse as any).blockchainError) {
        blockchainError = (exceptionResponse as any).blockchainError;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error: "Blockchain Error",
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Add blockchain-specific details if available
    if (transactionHash) {
      (errorResponse as any).transactionHash = transactionHash;
    }

    if (blockchainError) {
      (errorResponse as any).blockchainError = blockchainError;
    }

    this.logger.error(
      `${requestId} - Blockchain Error: ${request.method} ${request.url} - ${message}`,
      JSON.stringify(errorResponse),
    );

    response.status(statusCode).json(errorResponse);
  }
}
