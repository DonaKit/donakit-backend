import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service.js';
import { CampaignMetricRepository } from './campaign-metric.repository.js';

describe('CampaignMetricRepository', () => {
  let repository: CampaignMetricRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      campaign_metric: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    repository = new CampaignMetricRepository(
      mockPrisma as unknown as PrismaService,
    );
  });

  it('debe registrar un evento de visita en campaign_metric', async () => {
    mockPrisma.campaign_metric.create.mockResolvedValue({
      id: 'metric-uuid-1',
      campaign_id: 'campaign-1',
      device_type: 'MOBILE',
      referrer: 'DIRECT',
      ip_hash: 'abc123hash',
      visited_at: new Date(),
    });

    const result = await repository.create({
      campaignId: 'campaign-1',
      deviceType: 'MOBILE',
      referrer: 'DIRECT',
      ipHash: 'abc123hash',
    });

    expect(mockPrisma.campaign_metric.create).toHaveBeenCalledWith({
      data: {
        campaign_id: 'campaign-1',
        device_type: 'MOBILE',
        referrer: 'DIRECT',
        ip_hash: 'abc123hash',
      },
    });
    expect(result.id).toBe('metric-uuid-1');
  });

  it('debe contar las visitas de una campaña', async () => {
    mockPrisma.campaign_metric.count.mockResolvedValue(12);

    const count = await repository.countByCampaignId('campaign-1');
    expect(count).toBe(12);
    expect(mockPrisma.campaign_metric.count).toHaveBeenCalledWith({
      where: { campaign_id: 'campaign-1' },
    });
  });

  it('debe obtener el listado de visitas de una campaña', async () => {
    const mockVisits = [
      { id: '1', campaign_id: 'campaign-1', visited_at: new Date() },
    ];
    mockPrisma.campaign_metric.findMany.mockResolvedValue(mockVisits);

    const result = await repository.findByCampaignId('campaign-1');
    expect(result).toEqual(mockVisits);
    expect(mockPrisma.campaign_metric.findMany).toHaveBeenCalledWith({
      where: { campaign_id: 'campaign-1' },
      orderBy: { visited_at: 'desc' },
    });
  });
});
