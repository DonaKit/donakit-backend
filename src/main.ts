import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter.js';
import { validationExceptionFactory } from './common/filters/validation-exception.factory.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir comunicación fluida con la aplicación frontend
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Habilitar validación global mediante class-validator y mapeo de errores estructurados
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      stopAtFirstError: false,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Manejo global de excepciones para errores de base de datos y conexión a Supabase
  app.useGlobalFilters(new DatabaseExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(` Servidor DonaKit iniciado y escuchando en el puerto ${port}`);
}

await bootstrap();
