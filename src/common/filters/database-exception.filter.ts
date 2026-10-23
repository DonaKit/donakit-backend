import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message =
      'Ocurrió un error inesperado al procesar la operación en la base de datos.';
    let errorType = 'Internal Server Error';

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      errorType = 'Service Unavailable';
      message =
        'Error de conexión con la base de datos. Verifique la conectividad con el servicio de Supabase.';
      this.logger.error(
        `[DB_CONN_ERROR] Initialization error: ${exception.message}`,
      );
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(
        `[DB_KNOWN_ERROR] Code ${exception.code}: ${exception.message}`,
      );

      switch (exception.code) {
        case 'P1000':
        case 'P1001':
        case 'P1002':
        case 'P1003':
        case 'P1017':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          errorType = 'Service Unavailable';
          message =
            'No se pudo conectar con el servidor de base de datos. Por favor, reintente en unos momentos.';
          break;

        case 'P2002': {
          status = HttpStatus.CONFLICT;
          errorType = 'Conflict';
          const metaTarget = exception.meta?.target;
          const target = Array.isArray(metaTarget)
            ? metaTarget.join(', ')
            : typeof metaTarget === 'string'
              ? metaTarget
              : 'recurso';
          message = `Ya existe un registro con el mismo valor único para el campo: ${target}.`;
          break;
        }

        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          errorType = 'Bad Request';
          message =
            'La operación hace referencia a un registro relacionado inexistente (p. ej. centro de salud).';
          break;

        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          errorType = 'Not Found';
          message = 'El registro solicitado no existe en la base de datos.';
          break;

        default:
          status = HttpStatus.BAD_REQUEST;
          errorType = 'Database Request Error';
          message = `Error en la solicitud de base de datos (${exception.code}).`;
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'Bad Request';
      message =
        'Error en los tipos o estructura de datos enviados a la base de datos.';
      this.logger.warn(`[DB_VALIDATION_ERROR] ${exception.message}`);
    } else if (exception instanceof Error) {
      this.logger.error(
        `[DB_UNEXPECTED_ERROR] ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorType,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
