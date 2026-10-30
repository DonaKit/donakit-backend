import type { asset_format } from '@prisma/client';

export class CampaignAssetEntity {
  id: string;
  campaignId: string;
  format: asset_format;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: Date;

  constructor(partial: Partial<CampaignAssetEntity>) {
    Object.assign(this, partial);
  }
}

