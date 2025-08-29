import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Vendor } from './entities/vendor.entity';
import { VendorProfile } from './entities/vendor-profile.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { ServiceListing } from './entities/service-listing.entity';
import { ServicePricing } from './entities/service-pricing.entity';
import { ServiceBooking } from './entities/service-booking.entity';
import { BookingPayment } from './entities/booking-payment.entity';
import { VendorReview } from './entities/vendor-review.entity';
import { Commission } from './entities/commission.entity';
import { PaymentDistribution } from './entities/payment-distribution.entity';

// Services
import { VendorService } from './services/vendor.service';
import { MarketplaceService } from './services/marketplace.service';
import { BookingService } from './services/booking.service';
import { CommissionService } from './services/commission.service';
import { AnalyticsService } from './services/analytics.service';

// Controllers
import { VendorController } from './controllers/vendor.controller';
import { MarketplaceController } from './controllers/marketplace.controller';
import { BookingController } from './controllers/booking.controller';
import { CommissionController } from './controllers/commission.controller';
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      VendorProfile,
      ServiceCategory,
      ServiceListing,
      ServicePricing,
      ServiceBooking,
      BookingPayment,
      VendorReview,
      Commission,
      PaymentDistribution,
    ]),
  ],
  controllers: [
    VendorController,
    MarketplaceController,
    BookingController,
    CommissionController,
    AnalyticsController,
  ],
  providers: [
    VendorService,
    MarketplaceService,
    BookingService,
    CommissionService,
    AnalyticsService,
  ],
  exports: [
    VendorService,
    MarketplaceService,
    BookingService,
    CommissionService,
    AnalyticsService,
  ],
})
export class MarketplaceModule {}
