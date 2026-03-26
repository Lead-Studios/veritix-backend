import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { IdempotencyService } from "./idempotency.service";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private idempotencyService: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.idempotencyResponse) {
      response.status(request.idempotencyResponse.statusCode);
      return of(request.idempotencyResponse.body);
    }

    return next.handle().pipe(
      tap(async (data) => {
        if (request.idempotencyKey) {
          await this.idempotencyService.store(
            request.idempotencyKey,
            request.requestHash,
            data,
            response.statusCode,
          );
        }
      }),
    );
  }
}
