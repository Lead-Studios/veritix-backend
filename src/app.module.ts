import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
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
  providers: [AppService],
})
export class AppModule {}
