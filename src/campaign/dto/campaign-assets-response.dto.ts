import type { CampaignAssetEntity } from '../entities/campaign-asset.entity.js';

export class CampaignAssetsResponseDto {
  success: boolean;
  message: string;
  data: CampaignAssetEntity[];
}

