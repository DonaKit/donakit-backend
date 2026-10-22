import type { institution as InstitutionRecord } from '@prisma/client';
import type { CampaignEntity } from '../entities/campaign.entity.js';

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
}

export interface ICampaignRepository {
  create(data: CreateCampaignData): Promise<CampaignEntity>;
  findById(id: string): Promise<CampaignEntity | null>;
  findBySlug(slug: string): Promise<CampaignEntity | null>;
  institutionExists(institutionId: string): Promise<boolean>;
  getInstitutionById(institutionId: string): Promise<InstitutionRecord | null>;
}
