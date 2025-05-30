import { DataSource } from "typeorm";
import { User } from "./users/entities/user.entity";
import { Ticket } from "./tickets/entities/ticket.entity";
import { Event } from "./events/entities/event.entity";
import { Admin } from "./admin/entities/admin.entity";
import { Sponsor } from "./sponsors/sponsor.entity";
import { SpecialGuest } from "./special-guests/entities/special-guest.entity";
import { Collaborator } from "./collaborator/entities/collaborator.entity";
import { Poster } from "./posters/entities/poster.entity";
import { EventGallery } from "./event-gallery/entities/event-gallery.entity";
import { Category } from "./category/category.entity";
import { Conference } from "./conference/entities/conference.entity";
import { GalleryItem } from "./event-gallery/entities/gallery-item.entity";
import { config } from "dotenv";
import { PricingRule } from "./dynamic-pricing/pricing/entities/pricing-rule.entity";
import { SpecialSpeaker } from "./special-speaker/entities/special-speaker.entity";

// Load environment variables from .env file
config();
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DB_URL || undefined,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Ticket,
    Admin,
    Event,
    Sponsor,
    SpecialGuest,
    Collaborator,
    Poster,
    EventGallery,
    PricingRule,
    Category,
    SpecialSpeaker,
    Conference,
    GalleryItem,
  ],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
  logging: true,
});
