import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstitutionController } from './institution.controller.js';
import { InstitutionService } from './institution.service.js';

describe('InstitutionController', () => {
  let controller: InstitutionController;
  let service: InstitutionService;

  const mockService = {
    findAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as InstitutionService;
    controller = new InstitutionController(service);
  });

  describe('findAll', () => {
    it('debe llamar a service.findAll y retornar directamente el listado de instituciones', async () => {
      const mockList = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Hospital Garrahan',
          address: 'Pichincha 1890',
          city: 'Buenos Aires',
        },
      ];

      mockService.findAll.mockResolvedValue(mockList);

      const response = await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockList);
    });
  });
});
