import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FaqController } from './faq.controller.js';
import type { FaqService } from './faq.service.js';

describe('FaqController', () => {
  let controller: FaqController;
  let service: FaqService;

  const mockService = {
    findAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as FaqService;
    controller = new FaqController(service);
  });

  it('debe responder con las FAQs obtenidas del servicio', async () => {
    mockService.findAll.mockResolvedValue([
      { id: 'faq-1', question: '¿Puedo donar?' },
    ]);

    const result = await controller.findAll('MEDICACION', 'inst-1');

    expect(mockService.findAll).toHaveBeenCalledWith('MEDICACION', 'inst-1');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});

