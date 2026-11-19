import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter.js';
import { validationExceptionFactory } from './common/filters/validation-exception.factory.js';
import { buildCorsOptions } from './config/cors.config.js';

function loadEnvFileIfPresent(): void {
  try {
    process.loadEnvFile();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code !== 'ENOENT') {
      throw error;
    }
  }
}

async function bootstrap() {
  loadEnvFileIfPresent();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Incrementar el límite de tamaño del cuerpo JSON para admitir placas en Base64
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Configuración de CORS estrictamente controlada por FRONTEND_URL (.env / entorno de despliegue)
  const frontendUrl = process.env.FRONTEND_URL ?? '';
  if (!frontendUrl.trim()) {
    logger.warn(
      'FRONTEND_URL no está definido en el entorno. Las peticiones CORS desde navegadores serán rechazadas.',
    );
  }
  app.enableCors(buildCorsOptions(frontendUrl));

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
