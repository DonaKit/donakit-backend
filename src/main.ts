import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter.js';
import { validationExceptionFactory } from './common/filters/validation-exception.factory.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS segura y flexible:
  // - Soporta desarrollo local (localhost / 127.0.0.1 en cualquier puerto)
  // - Soporta la URL del frontend en Vercel (y sus previews automáticas)
  // - Soporta cualquier otra URL configurada en el .env mediante FRONTEND_URL (lista separada por comas)
  const rawFrontendUrls = process.env.FRONTEND_URL ?? '';
  const envConfiguredOrigins = rawFrontendUrls
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const defaultKnownOrigins = ['https://donakit-frontend.vercel.app'];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // 1. Peticiones sin origen (ej. curl, Postman, llamadas server-to-server o Render health checks)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      // 2. Orígenes locales (cualquier puerto en localhost o 127.0.0.1)
      const isLocalhost =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(
          normalizedOrigin,
        );
      if (isLocalhost) {
        return callback(null, true);
      }

      // 3. URL de producción y previews legítimas de Vercel (hash de commit hexadecimal o rama 'git-*')
      // Previene que terceros registren proyectos arbitrarios en Vercel con el prefijo
      const isVercelPreview =
        /^https:\/\/donakit-frontend-(git-[a-z0-9_-]+|[0-9a-f]{7,16}(-[a-z0-9_-]+)?)\.vercel\.app$/i.test(
          normalizedOrigin,
        );
      const isVercelDomain =
        defaultKnownOrigins.includes(normalizedOrigin) || isVercelPreview;
      if (isVercelDomain) {
        return callback(null, true);
      }

      // 4. Cualquier otra URL configurada dinámicamente en el .env
      if (envConfiguredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      callback(
        new Error(
          `Acceso denegado por política CORS para el origen: ${origin}`,
        ),
      );
    },
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
