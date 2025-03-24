import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SponsorsModule } from "./sponsors/sponsors.module";
import { PostersModule } from './posters/posters.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "lagodxy",
      password: "4633922",
      database: "test",
      entities: [__dirname + "/../**/*.entity{.ts,.js}"],
      synchronize: true,
    }),
    SponsorsModule,
    PostersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
