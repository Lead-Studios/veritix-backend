import { Module } from "@nestjs/common";
import { ConferenceGalleryService } from "./conference-gallery.service";
import { ConferenceGalleryController } from "./conference-gallery.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConferenceGallery } from "./entities/conference-gallery.entity";
import { Conference } from "../conference/entities/conference.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ConferenceGallery, Conference])],
  providers: [ConferenceGalleryService],
  controllers: [ConferenceGalleryController],
})
export class ConferenceGalleryModule {}
