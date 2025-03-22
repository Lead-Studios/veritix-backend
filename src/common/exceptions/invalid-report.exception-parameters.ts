import { BadRequestException } from "@nestjs/common";

export class InvalidReportParametersException extends BadRequestException {
  constructor(message: string) {
    super(`Invalid report parameters: ${message}`);
  }
}
