import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { DatabaseModule } from "./database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersController } from "./users/users.controller";
import { SponsorsModule } from "./sponsors/sponsors.module";
import envConfiguration from "config/envConfiguration";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventsModule } from "./events/events.module";
import { TicketModule } from "./tickets/tickets.module";
import { SpecialGuestModule } from "./special-guests/special-guests.module";
import { PostersModule } from './posters/posters.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [envConfiguration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("database.host"),
        port: configService.get<number>("database.port"),
        username: configService.get<string>("database.username"),
        password: configService.get<string>("database.password"),
        database: configService.get<string>("database.name"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
      })
    }),
    SponsorsModule,
    UsersModule,
    AuthModule,
    DatabaseModule,
    EventsModule,
    TicketModule,
    SpecialGuestModule,
    PostersModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
