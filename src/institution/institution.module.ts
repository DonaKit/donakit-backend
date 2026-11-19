import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignModule } from '../campaign/campaign.module.js';
import { InstitutionController } from './institution.controller.js';
import { InstitutionService } from './institution.service.js';

@Module({
  imports: [CampaignModule, AuthModule],
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
