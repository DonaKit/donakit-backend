import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class RequirementService {
  private readonly logger = new Logger(RequirementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la lista de requisitos generales y condiciones de salud para donar sangre.
   */
  async findAll(
    category?: string,
    immediateOnly?: boolean,
    institutionId?: string,
  ) {
    this.logger.log('Consultando requisitos de donación públicos');
    const where: Prisma.requirementWhereInput = {
      ...(institutionId
        ? {
            OR: [{ institution_id: null }, { institution_id: institutionId }],
          }
        : { institution_id: null }),
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      ...(immediateOnly !== undefined
        ? { is_immediate_disqualification: immediateOnly }
        : {}),
    };

    const requirements = await this.prisma.requirement.findMany({
      where,
      orderBy: [{ display_order: 'asc' }, { title: 'asc' }],
    });

    return requirements.map((r) => ({
      id: r.id,
      institutionId: r.institution_id,
      title: r.title,
      description: r.description,
      isImmediateDisqualification: r.is_immediate_disqualification,
      category: r.category,
      displayOrder: r.display_order,
    }));
  }
}

