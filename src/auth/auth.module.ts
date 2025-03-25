import { forwardRef, Module } from "@nestjs/common";
import { AuthService } from "./providers/auth.service";
import { AuthController } from "./auth.controller";
import { HashingProvider } from "./providers/hashing-provider";
import { BcryptProvider } from "./providers/bcrypt-provider";
import { UsersModule } from "src/users/users.module";
import { SignInProvider } from "./providers/sign-in.provider";
import { GenerateTokenProvider } from "./providers/generate-token.provider";
import jwtConfig from "src/config/jwt.config";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { RefreshTokenProvider } from "./providers/refresh-token.provider";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../../security/strategies/jwt.strategy";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule.forFeature(jwtConfig),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.get<string>("jwt.expiresIn"),
          issuer: configService.get<string>("jwt.issuer"),
          audience: configService.get<string>("jwt.audience"),
        },
      }),
    }),
  ],

  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
    SignInProvider,
    GenerateTokenProvider,
    RefreshTokenProvider,
  ],
  exports: [
    AuthService,
    HashingProvider,
    PassportModule,
    JwtModule,
    JwtStrategy,
  ],
})
export class AuthModule {}
