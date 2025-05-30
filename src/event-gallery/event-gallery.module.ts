import { TypeOrmModule } from "@nestjs/typeorm";
import { EventGallery } from "./entities/event-gallery.entity";
import { EventGalleryController } from "./event-gallery.controller";
import { EventGalleryService } from "./event-gallery.service";
import { Module } from "@nestjs/common";
import { Event } from "src/events/entities/event.entity";
import { GalleryItem } from "./entities/gallery-item.entity";

@Module({
  imports: [TypeOrmModule.forFeature([EventGallery, Event, GalleryItem])],
  controllers: [EventGalleryController],
  providers: [EventGalleryService],
})
export class EventGalleryModule {}
