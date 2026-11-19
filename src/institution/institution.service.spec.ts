import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstitutionService } from './institution.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      institution: {
        findMany: vi.fn(),
      },
    };
    service = new InstitutionService(mockPrisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('debe consultar solo instituciones activas acotando campos a id, name, address, city ordenadas por nombre', async () => {
      const mockInstitutions = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Hospital Garrahan',
          address: 'Pichincha 1890',
          city: 'Buenos Aires',
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Hospital Italiano',
          address: 'Gascón 450',
          city: 'Buenos Aires',
        },
      ];

      mockPrisma.institution.findMany.mockResolvedValue(mockInstitutions);

      const result = await service.findAll();

      expect(mockPrisma.institution.findMany).toHaveBeenCalledWith({
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

      expect(result).toEqual(mockInstitutions);
    });
  });
});
