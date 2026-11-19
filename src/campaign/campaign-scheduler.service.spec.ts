import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignSchedulerService } from './campaign-scheduler.service.js';
import type { CampaignRepository } from './repositories/campaign.repository.js';

describe('CampaignSchedulerService', () => {
  let scheduler: CampaignSchedulerService;
  let mockCampaignRepository: {
    expireOverdueCampaigns: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCampaignRepository = {
      expireOverdueCampaigns: vi.fn(),
    };

    scheduler = new CampaignSchedulerService(
      mockCampaignRepository as unknown as CampaignRepository,
    );
  });

  it('debe ejecutar expirarCampaniasVencidas llamando al repositorio', async () => {
    mockCampaignRepository.expireOverdueCampaigns.mockResolvedValue(5);

    await scheduler.expirarCampaniasVencidas();

    expect(mockCampaignRepository.expireOverdueCampaigns).toHaveBeenCalledOnce();
  });

  it('debe capturar errores sin propagar excepción al cron runner', async () => {
    mockCampaignRepository.expireOverdueCampaigns.mockRejectedValue(
      new Error('DB Connection Timeout'),
    );

    await expect(scheduler.expirarCampaniasVencidas()).resolves.toBeUndefined();
  });
});
