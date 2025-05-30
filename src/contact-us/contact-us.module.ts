import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContactUsService } from "./contact-us.service";
import { ContactUsController } from "./contact-us.controller";
import { ContactUs } from "./entities/contact-us.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ContactUs])],
  controllers: [ContactUsController],
  providers: [ContactUsService],
})
export class ContactUsModule {}
