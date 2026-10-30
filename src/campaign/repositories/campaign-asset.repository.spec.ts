import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service.js';
import { CampaignAssetRepository } from './campaign-asset.repository.js';

describe('CampaignAssetRepository', () => {
  let repository: CampaignAssetRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      campaign_asset: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    repository = new CampaignAssetRepository(mockPrisma as unknown as PrismaService);
  });

  it('debe crear un nuevo asset si no existe uno previo para ese formato', async () => {
    mockPrisma.campaign_asset.findFirst.mockResolvedValue(null);
    mockPrisma.campaign_asset.create.mockResolvedValue({
      id: 'asset-1',
      campaign_id: 'campaign-1',
      format: 'SQUARE_1_1',
      image_url: 'https://storage/asset-1.png',
      width: 1080,
      height: 1080,
      created_at: new Date(),
    });

    const result = await repository.save({
      campaignId: 'campaign-1',
      format: 'SQUARE_1_1',
      imageUrl: 'https://storage/asset-1.png',
      width: 1080,
      height: 1080,
    });

    expect(mockPrisma.campaign_asset.findFirst).toHaveBeenCalledWith({
      where: { campaign_id: 'campaign-1', format: 'SQUARE_1_1' },
    });
    expect(mockPrisma.campaign_asset.create).toHaveBeenCalled();
    expect(result.id).toBe('asset-1');
    expect(result.format).toBe('SQUARE_1_1');
  });

  it('debe actualizar el asset existente si ya había uno previo para ese formato', async () => {
    mockPrisma.campaign_asset.findFirst.mockResolvedValue({
      id: 'asset-existing',
      campaign_id: 'campaign-1',
      format: 'SQUARE_1_1',
      image_url: 'https://storage/old.png',
      width: 1080,
      height: 1080,
      created_at: new Date(),
    });

    mockPrisma.campaign_asset.update.mockResolvedValue({
      id: 'asset-existing',
      campaign_id: 'campaign-1',
      format: 'SQUARE_1_1',
      image_url: 'https://storage/new.png',
      width: 1080,
      height: 1080,
      created_at: new Date(),
    });

    const result = await repository.save({
      campaignId: 'campaign-1',
      format: 'SQUARE_1_1',
      imageUrl: 'https://storage/new.png',
      width: 1080,
      height: 1080,
    });

    expect(mockPrisma.campaign_asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-existing' },
      data: {
        image_url: 'https://storage/new.png',
        width: 1080,
        height: 1080,
      },
    });
    expect(result.imageUrl).toBe('https://storage/new.png');
  });

  it('debe retornar todos los assets de una campaña', async () => {
    mockPrisma.campaign_asset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        campaign_id: 'campaign-1',
        format: 'SQUARE_1_1',
        image_url: 'https://storage/1.png',
        width: 1080,
        height: 1080,
        created_at: new Date(),
      },
    ]);

    const results = await repository.findByCampaignId('campaign-1');
    expect(results).toHaveLength(1);
    expect(results[0].format).toBe('SQUARE_1_1');
  });
});

