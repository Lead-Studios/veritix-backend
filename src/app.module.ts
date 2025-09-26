import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizerController } from './organizer/organizer.controller';
import { OrganizerService } from './organizer/organizer.service';

@Module({
  imports: [],
  controllers: [AppController, OrganizerController],
  providers: [AppService, OrganizerService],
})
export class AppModule {}
