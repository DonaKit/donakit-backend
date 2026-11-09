import { Module } from '@nestjs/common';
import { CampaignModule } from '../campaign/campaign.module.js';
import { InstitutionController } from './institution.controller.js';
import { InstitutionService } from './institution.service.js';

@Module({
  imports: [CampaignModule],
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
