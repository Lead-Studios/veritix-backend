import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { BadgeController } from "./badge.controller"
import { BadgeService } from "./badge.service"
import { Attendee } from "./entities/attendee.entity"
import { ConferenceModule } from "../conference/conference.module"

@Module({
  imports: [TypeOrmModule.forFeature([Attendee]), ConferenceModule],
  controllers: [BadgeController],
  providers: [BadgeService],
  exports: [BadgeService],
})
export class BadgeModule {}
