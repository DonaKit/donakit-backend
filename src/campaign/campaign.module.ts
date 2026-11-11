import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import { CampaignAssetRepository } from './repositories/campaign-asset.repository.js';
import { CampaignMetricRepository } from './repositories/campaign-metric.repository.js';
import { CampaignRepository } from './repositories/campaign.repository.js';
import { DownloadLogRepository } from './repositories/download-log.repository.js';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [CampaignController],
  providers: [
    CampaignService,
    CampaignRepository,
    CampaignAssetRepository,
    DownloadLogRepository,
    CampaignMetricRepository,
  ],
  exports: [
    CampaignService,
    CampaignRepository,
    CampaignAssetRepository,
    DownloadLogRepository,
    CampaignMetricRepository,
  ],
})
export class CampaignModule {}
