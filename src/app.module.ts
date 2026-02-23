import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from './blockchain/blockchain.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets-inventory/tickets.module';

import databaseConfig from './config/database-config';
import appConfig from './config/app.config';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),

    // Database connection (PostgreSQL)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('database.host');
        const port = configService.get('database.port');
        const username = configService.get('database.username');
        const database = configService.get('database.database');

        console.log('DB HOST:', host);
        console.log('DB PORT:', port);
        console.log('DB USER:', username);
        console.log('DB NAME:', database);

        return {
          type: 'postgres',
          host,
          port,
          username,
          password: configService.get('database.password'),
          database,
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),

    AuthModule,
    // Blockchain module for future blockchain anchoring and verification
    BlockchainModule.register({
      isGlobal: true,
      config: {
        provider: 'STELLAR',
        enabled: false, // Disabled until Stellar integration is implemented
      },
    }),
    UsersModule,
    TicketsModule,
    OrdersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
