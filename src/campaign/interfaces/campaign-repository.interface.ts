import type {
  campaign_status,
  institution as InstitutionRecord,
} from '@prisma/client';
import type { CampaignEntity } from '../entities/campaign.entity.js';
import type { FaqItemEntity } from '../entities/faq-item.entity.js';
import type { RequirementEntity } from '../entities/requirement.entity.js';

export interface CreateCampaignData {
  id?: string;
  slug: string;
  editToken: string;
  institutionId: string;
  patientName: string;
  bloodType: string;
  donationType?: string;
  targetDonors?: number;
  deadline?: Date;
  observations?: string;
  generatedCopy?: string;
  status?: campaign_status;
}

export interface UpdateCampaignData {
  patientName?: string;
  slug?: string;
  institutionId?: string;
  bloodType?: string;
  donationType?: string | null;
  targetDonors?: number | null;
  deadline?: Date | null;
  observations?: string | null;
  generatedCopy?: string | null;
  status?: campaign_status;
}

export interface ICampaignRepository {
  create(data: CreateCampaignData): Promise<CampaignEntity>;
  findById(id: string): Promise<CampaignEntity | null>;
  findBySlug(slug: string): Promise<CampaignEntity | null>;
  institutionExists(institutionId: string): Promise<boolean>;
  getInstitutionById(institutionId: string): Promise<InstitutionRecord | null>;
  updateStatus(id: string, status: campaign_status): Promise<CampaignEntity>;
  update(id: string, data: UpdateCampaignData): Promise<CampaignEntity>;
  findRequirements(
    institutionId?: string,
    category?: string,
    immediateOnly?: boolean,
  ): Promise<RequirementEntity[]>;
  findFaqs(
    institutionId?: string,
    category?: string,
  ): Promise<FaqItemEntity[]>;
}

