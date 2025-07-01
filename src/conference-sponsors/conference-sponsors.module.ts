import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { ConferenceSponsorsController } from "./conference-sponsors.controller";
import { ConferenceSponsorsService } from "./conference-sponsors.service";
import { ConferenceSponsor } from "./entities/conference-sponsor.entity";
import { Conference } from "./../conference/entities/conference.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ConferenceSponsor, Conference]),
    MulterModule.register({
      dest: "./uploads",
    }),
    AuthModule,
  ],
  controllers: [ConferenceSponsorsController],
  providers: [ConferenceSponsorsService],
  exports: [ConferenceSponsorsService],
})
export class ConferenceSponsorsModule {}
