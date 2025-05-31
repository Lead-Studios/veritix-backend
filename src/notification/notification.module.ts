import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { User } from "src/users/entities/user.entity";
import { BullModule } from "@nestjs/bull";
import { Event } from "src/events/entities/event.entity";
import { WaitlistController } from "./waitlist.controller";
import { WaitlistService } from "./waitlist.service";
import { NotificationProcessor } from "./notification.processor";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { WaitlistEntry } from "./entities/waitlist-entry.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Event, WaitlistEntry]),
    BullModule.registerQueue({
      name: "notification",
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.MAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
      defaults: {
        from: `"${process.env.MAIL_FROM_NAME || "Event App"}" <${process.env.MAIL_FROM || "noreply@eventapp.com"}>`,
      },
      template: {
        dir: join(__dirname, "templates"),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [NotificationController, WaitlistController],
  providers: [NotificationService, WaitlistService, NotificationProcessor],
  exports: [NotificationService, WaitlistService],
})
export class NotificationModule {}
