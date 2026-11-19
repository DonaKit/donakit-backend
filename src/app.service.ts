import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'DonaKit API Online';
  }

  async getHealth(): Promise<{ status: string }> {
    try {
      // Verificación de conectividad mínima sin exponer metadatos ni versiones internas
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(
        'Error al verificar la salud de la base de datos',
        error,
      );
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Servicio no disponible',
      });
    }
  }
}
