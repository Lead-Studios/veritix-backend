import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SponsorsModule } from "./sponsors/sponsors.module";

@Module({
  imports: [SponsorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
