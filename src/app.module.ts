import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
<<<<<<< HEAD
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
=======
import { SponsorsModule } from "./sponsors/sponsors.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "your_db_user",
      password: "your_db_password",
      database: "your_db_name",
      entities: [__dirname + "/../**/*.entity{.ts,.js}"],
      synchronize: true,
    }),
    SponsorsModule,
  ],
  controllers: [AppController],
>>>>>>> ff556710b3e2d7f04c81dbfcda43b06a07f8cf64
  providers: [AppService],
})
export class AppModule {}
