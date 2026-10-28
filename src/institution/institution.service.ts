import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { InstitutionItemDto } from './dto/institution-item.dto.js';

@Injectable()
export class InstitutionService {
  private readonly logger = new Logger(InstitutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la lista de centros de salud e instituciones activas.
   * Información acotada para selectores/combobox en el frontend.
   */
  async findAll(): Promise<InstitutionItemDto[]> {
    this.logger.log(
      'Consultando instituciones activas para selección en combobox',
    );
    const institutions = await this.prisma.institution.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return institutions;
  }
}
