import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service.js';
import { DownloadLogRepository } from './download-log.repository.js';

describe('DownloadLogRepository', () => {
  let repository: DownloadLogRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      download_log: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    repository = new DownloadLogRepository(mockPrisma as unknown as PrismaService);
  });

  it('debe registrar un evento de descarga en download_log', async () => {
    mockPrisma.download_log.create.mockResolvedValue({
      id: 'log-uuid-1',
      campaign_id: 'campaign-1',
      download_type: 'IMAGE_1_1',
      ip_hash: 'abc123hash',
      downloaded_at: new Date(),
    });

    const result = await repository.create({
      campaignId: 'campaign-1',
      downloadType: 'IMAGE_1_1',
      ipHash: 'abc123hash',
    });

    expect(mockPrisma.download_log.create).toHaveBeenCalledWith({
      data: {
        campaign_id: 'campaign-1',
        download_type: 'IMAGE_1_1',
        ip_hash: 'abc123hash',
      },
    });
    expect(result.id).toBe('log-uuid-1');
  });

  it('debe contar las descargas de una campaña', async () => {
    mockPrisma.download_log.count.mockResolvedValue(5);

    const count = await repository.countByCampaignId('campaign-1');
    expect(count).toBe(5);
  });
});

