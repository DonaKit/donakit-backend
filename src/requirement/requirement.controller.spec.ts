import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequirementController } from './requirement.controller.js';
import type { RequirementService } from './requirement.service.js';

describe('RequirementController', () => {
  let controller: RequirementController;
  let service: RequirementService;

  const mockService = {
    findAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as RequirementService;
    controller = new RequirementController(service);
  });

  it('debe responder con los requisitos obtenidos del servicio', async () => {
    mockService.findAll.mockResolvedValue([
      { id: 'req-1', title: 'Edad' },
    ]);

    const result = await controller.findAll('GENERAL', 'true', 'inst-1');

    expect(mockService.findAll).toHaveBeenCalledWith('GENERAL', true, 'inst-1');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});

