import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
