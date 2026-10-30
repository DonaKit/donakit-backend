import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import { CampaignAssetRepository } from './repositories/campaign-asset.repository.js';
import { CampaignRepository } from './repositories/campaign.repository.js';

@Module({
  imports: [StorageModule],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignRepository, CampaignAssetRepository],
  exports: [CampaignService, CampaignRepository, CampaignAssetRepository],
})
export class CampaignModule {}
