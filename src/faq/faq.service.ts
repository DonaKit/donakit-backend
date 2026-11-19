import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la lista de preguntas frecuentes públicas.
   */
  async findAll(category?: string, institutionId?: string) {
    this.logger.log('Consultando preguntas frecuentes públicas');
    const where: Prisma.faq_itemWhereInput = {
      ...(institutionId
        ? {
            OR: [{ institution_id: null }, { institution_id: institutionId }],
          }
        : { institution_id: null }),
      ...(category
        ? { category: { equals: category, mode: 'insensitive' } }
        : {}),
    };

    const faqs = await this.prisma.faq_item.findMany({
      where,
      orderBy: [{ display_order: 'asc' }, { question: 'asc' }],
    });

    return faqs.map((f) => ({
      id: f.id,
      institutionId: f.institution_id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      displayOrder: f.display_order,
    }));
  }
}
