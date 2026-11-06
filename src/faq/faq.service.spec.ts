import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { FaqService } from './faq.service.js';

describe('FaqService', () => {
  let service: FaqService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      faq_item: {
        findMany: vi.fn(),
      },
    };
    service = new FaqService(mockPrisma as unknown as PrismaService);
  });

  it('debe listar preguntas frecuentes filtrando opcionalmente por categoría e institución', async () => {
    const mockFaqs = [
      {
        id: 'faq-1',
        institution_id: null,
        question: '¿Puedo donar con tatuaje?',
        answer: 'Sí, luego de 6 meses.',
        category: 'TATUAJES',
        display_order: 1,
      },
    ];
    mockPrisma.faq_item.findMany.mockResolvedValue(mockFaqs);

    const result = await service.findAll('TATUAJES', 'inst-1');
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe('¿Puedo donar con tatuaje?');
    expect(mockPrisma.faq_item.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ institution_id: null }, { institution_id: 'inst-1' }],
        category: { equals: 'TATUAJES', mode: 'insensitive' },
      },
      orderBy: [{ display_order: 'asc' }, { question: 'asc' }],
    });
  });
});

