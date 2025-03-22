import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketModule } from './tickets/tickets.module';
import { SpecialGuestModule } from './special-guests/special-guests.module';
import { EventsModule } from './events/events.module';

import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 3306,
      username: 'your_db_user',
      password: 'your_db_password',
      database: 'your_db_name',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true, // Set to false in production
    }),
  ],
})
@Module({
  imports: [TicketModule, EventsModule, SpecialGuestModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
