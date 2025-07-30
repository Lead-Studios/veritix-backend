import { Module } from '@nestjs/common';
import { FunnelTrackingController } from './controllers/funnel-tracking.controller';
import { FunnelTrackingService } from './services/funnel-tracking.service';
import { FunnelTrackingMiddleware } from './middleware/funnel-tracking.middleware';
import { FunnelAction } from './entities/funnel-action.entity';
import { FunnelSession } from './entities/funnel-session.entity';
import { FunnelStats } from './entities/funnel-stats.entity';
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FunnelAction, FunnelSession, FunnelStats]),
    TenantRepositoryModule.forFeature([
      FunnelAction,
      FunnelSession,
      FunnelStats,
    ]),
  ],
  controllers: [FunnelTrackingController],
  providers: [FunnelTrackingService, FunnelTrackingMiddleware],
  exports: [FunnelTrackingService, FunnelTrackingMiddleware],
})
export class FunnelTrackingModule {}
