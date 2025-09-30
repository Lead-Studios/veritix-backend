import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from './logger/winston-logger.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(WinstonLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  logger.log(`Server starting on port ${port}`, 'Bootstrap');
  await app.listen(port);
  logger.log(`Server listening on port ${port}`, 'Bootstrap');
}
void bootstrap();
