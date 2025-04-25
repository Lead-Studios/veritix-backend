import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AdminService } from "./providers/admin.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminJwtStrategy } from "./strategies/admin-jwt.strategy";
import { AdminLocalStrategy } from "./strategies/admin-local.strategy";
import { Admin } from "./entities/admin.entity";
import { AdminAuthService } from "./providers/admin-auth.services";
import { BcryptProvider } from "./providers/bcrpt-provider";
import { HashingProvider } from "./providers/hashing-services";
import { AdminController } from "./admin.controller";
import { UsersModule } from "src/users/users.module";
import { User } from "src/users/entities/user.entity";
import { CampaignEmail } from "./entities/campaign-email.entity";
import { CampaignService } from "./providers/campaign.service";
import { DashboardService } from "./providers/dashboard.service";
import { TicketService } from "./providers/ticket.service";
import { AdminCampaignController } from "./admin-campaign.controller";
import { Event } from "src/events/entities/event.entity";
import { Ticket } from "src/tickets/entities/ticket.entity";
import { GenerateTokenProvider } from "../common/utils/generate-token.provider";
import { TokenVerificationProvider } from "./providers/verification.provider";

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User, CampaignEmail, Event, Ticket]),
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: "admin-jwt" }),
    JwtModule.registerAsync({
      // imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        resetPasswordSecret: configService.get<string>("jwt.resetPasswordSecret"),
        signOptions: {
          expiresIn: configService.get<string>("jwt.expiresIn"),
          issuer: configService.get<string>("jwt.issuer"),
          audience: configService.get<string>("jwt.audience"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminAuthController, AdminCampaignController],
  providers: [
    AdminService,
    AdminAuthService,
    AdminJwtStrategy,
    AdminLocalStrategy,
    CampaignService,
    DashboardService,
    TicketService,
    GenerateTokenProvider,
    TokenVerificationProvider,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [AdminService, AdminAuthService, HashingProvider, CampaignService, DashboardService, TicketService],
})
export class AdminModule {}
