import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"
import { Conference } from "./entities/conference.entity"
import { Session } from "./entities/session.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Conference, Session])],
  controllers: [ConferenceController],
  providers: [ConferenceService],
  exports: [ConferenceService],
})
export class ConferenceModule {}
