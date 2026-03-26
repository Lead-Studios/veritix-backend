import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IdempotencyKey } from "./idempotency.entity";
import { IdempotencyService } from "./idempotency.service";
import { IdempotencyGuard } from "./idempotency.guard";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKey])],
  providers: [IdempotencyService, IdempotencyGuard, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyGuard, IdempotencyInterceptor],
})
export class IdempotencyModule {}
