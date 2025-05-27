import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpLogger } from "./common/middlewares/httpLogger.middleware";
import { Logger } from "@nestjs/common";
import { DatabaseExceptionFilter } from "./common/filters";

async function bootstrap() {
  const logger = new Logger("MAIN");
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("Event Search API")
    .setDescription("API for searching events with fuzzy matching")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
  app.enableCors();

  if (process.env.NODE_ENV !== "production") {
    import("dotenv").then((dotenv) => {
      dotenv.config();
      logger.log("Environment variables loaded from .env file");
    });
    setInterval(() => {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      logger.log(`Memory Usage: ${Math.round(used * 100) / 100} MB`);
    }, 60000);
  }

  app.use(new HttpLogger().use);
  app.useGlobalFilters(new DatabaseExceptionFilter());

  await app.listen(process.env.PORT, () =>
    logger.log(`App running on port ${process.env.PORT}`),
  );
}
void bootstrap();
