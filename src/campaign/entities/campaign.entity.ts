import type { campaign_status } from '@prisma/client';

export class InstitutionSummary {
  id: string;
  name: string;
  address: string;
  city: string;
}

export class CampaignEntity {
  id: string;
  slug: string;
  editToken: string;
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

  constructor(partial: Partial<CampaignEntity>) {
    Object.assign(this, partial);
  }
}
