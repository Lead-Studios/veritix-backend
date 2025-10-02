import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbuseLog } from './abuse-log.entity';
import { AbuseLogService } from './abuse-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AbuseLog])],
  providers: [AbuseLogService],
  exports: [AbuseLogService],
})
export class AbuseLogModule {}
