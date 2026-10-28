import type { campaign_status } from '@prisma/client';
import type { InstitutionSummary } from '../entities/campaign.entity.js';

export class PublicCampaignDto {
  id: string;
  institutionId: string;
  patientName: string;
  bloodType: string;
  donationType: string | null;
  targetDonors: number | null;
  currentDonors: number | null;
  deadline: Date | null;
  observations: string | null;
  generatedCopy: string | null;
  status: campaign_status;
  createdAt: Date;
  updatedAt: Date;
  institution?: InstitutionSummary;
}

export class PublicCampaignResponseDto {
  success: boolean;
  message: string;
  data: PublicCampaignDto;
}
