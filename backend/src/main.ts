import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/** Mounts interactive OpenAPI docs at /docs (JSON at /docs-json). */
function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('p-mes API')
    .setDescription('p-mes backend API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const apiPrefix = config.get<string>('app.apiPrefix', 'api');
  const port = config.get<number>('app.port', 3000);

  app.setGlobalPrefix(apiPrefix);

  // Allow the frontend dev server to call the API and read pagination headers.
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins'),
    credentials: true,
    exposedHeaders: ['x-total-count'],
  });

  // Validate and strip unknown properties on every incoming payload.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  setupSwagger(app);

  // Run onModuleDestroy/beforeApplicationShutdown hooks on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  await app.listen(port);
  Logger.log(
    `Application running on http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  Logger.log(
    `API docs available at http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
