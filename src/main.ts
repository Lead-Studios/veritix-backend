import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global response envelope
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global structured error format
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  const configService = app.get(ConfigService);
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS')!
    .split(',');
  app.enableCors({ origin: allowedOrigins });

  // Serve uploaded files in local dev
  if (process.env.STORAGE_PROVIDER !== 's3' && process.env.NODE_ENV !== 'production') {
    app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  }

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const pkg = require('../package.json');
    const config = new DocumentBuilder()
      .setTitle('VeriTix API')
      .setVersion(pkg.version) // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      .addBearerAuth()
      .addTag('auth')
      .addTag('users')
      .addTag('events')
      .addTag('tickets')
      .addTag('orders')
      .addTag('verification')
      .addTag('admin')
      .addTag('stellar')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
