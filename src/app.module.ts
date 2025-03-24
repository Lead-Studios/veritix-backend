import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { DatabaseModule } from "./database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersController } from "./users/users.controller";

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    AuthModule
  ],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
