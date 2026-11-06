import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { RequirementService } from './requirement.service.js';

describe('RequirementService', () => {
  let service: RequirementService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      requirement: {
        findMany: vi.fn(),
      },
    };
    service = new RequirementService(mockPrisma as unknown as PrismaService);
  });

  it('debe listar requisitos filtrando por categoría, inhabilitaciones inmediatas e institución', async () => {
    const mockReqs = [
      {
        id: 'req-1',
        institution_id: null,
        title: 'Edad',
        description: '18 a 65',
        is_immediate_disqualification: true,
        category: 'GENERAL',
        display_order: 1,
      },
    ];
    mockPrisma.requirement.findMany.mockResolvedValue(mockReqs);

    const result = await service.findAll('GENERAL', true, 'inst-1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Edad');
    expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ institution_id: null }, { institution_id: 'inst-1' }],
        category: { equals: 'GENERAL', mode: 'insensitive' },
        is_immediate_disqualification: true,
      },
      orderBy: [{ display_order: 'asc' }, { title: 'asc' }],
    });
  });
});

