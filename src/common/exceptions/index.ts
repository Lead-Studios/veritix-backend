import { HttpException, HttpStatus } from "@nestjs/common";

export class ValidationException extends HttpException {
  constructor(message: string, errors?: any) {
    super(
      {
        message,
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class SessionException extends HttpException {
  constructor(message: string = "Session expired") {
    super(
      {
        message,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class DatabaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        message,
      },
      statusCode,
    );
  }
}

export class BlockchainException extends HttpException {
  constructor(message: string) {
    super(
      {
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
