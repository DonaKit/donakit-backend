import type { CampaignEntity } from '../entities/campaign.entity.js';

export class CampaignResponseDto {
  success: boolean;
  message: string;
  data: CampaignEntity;
}
