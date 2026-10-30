import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import { CampaignAssetRepository } from './repositories/campaign-asset.repository.js';
import { CampaignRepository } from './repositories/campaign.repository.js';
import { DownloadLogRepository } from './repositories/download-log.repository.js';

@Module({
  imports: [StorageModule],
  controllers: [CampaignController],
  providers: [
    CampaignService,
    CampaignRepository,
    CampaignAssetRepository,
    DownloadLogRepository,
  ],
  exports: [
    CampaignService,
    CampaignRepository,
    CampaignAssetRepository,
    DownloadLogRepository,
  ],
})
export class CampaignModule {}
