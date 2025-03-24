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

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User]),
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: "admin-jwt" }),
    JwtModule.registerAsync({
      // imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_ADMIN_EXPIRATION", "15m"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [
    AdminService,
    AdminAuthService,
    AdminJwtStrategy,
    AdminLocalStrategy,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [AdminService, AdminAuthService, HashingProvider],
})
export class AdminModule {}
