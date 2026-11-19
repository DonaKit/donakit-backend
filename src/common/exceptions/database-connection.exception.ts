import { HttpException, HttpStatus } from '@nestjs/common';

export class DatabaseConnectionException extends HttpException {
  constructor(
    message = 'No se pudo establecer conexión con la base de datos. Por favor, intente nuevamente más tarde.',
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
