import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenueShareRule } from './revenue-sharing.entity';
import { RevenueSharingService } from './revenue-sharing.service';
import { RevenueSharingController } from './revenue-sharing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RevenueShareRule])],
  controllers: [RevenueSharingController],
  providers: [RevenueSharingService],
  exports: [RevenueSharingService],
})
export class RevenueSharingModule {}