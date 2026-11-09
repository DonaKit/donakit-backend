import type { campaign_status } from '@prisma/client';
import type { CampaignAssetEntity } from './campaign-asset.entity.js';
import type { FaqItemEntity } from './faq-item.entity.js';
import type { RequirementEntity } from './requirement.entity.js';

export class InstitutionSummary {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  requirementsUrl?: string | null;
  faqUrl?: string | null;
  businessHours?: Record<string, any> | null;
  specificRequirements?: string | null;
  logoUrl?: string | null;
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
  assets?: CampaignAssetEntity[];
  requirements?: RequirementEntity[];
  faqs?: FaqItemEntity[];
  totalVisits?: number;

  constructor(partial: Partial<CampaignEntity>) {
    Object.assign(this, partial);
  }

  toPublic() {
    return {
      id: this.id,
      institutionId: this.institutionId,
      patientName: this.patientName,
      bloodType: this.bloodType,
      donationType: this.donationType,
      targetDonors: this.targetDonors,
      currentDonors: this.currentDonors,
      deadline: this.deadline,
      observations: this.observations,
      generatedCopy: this.generatedCopy,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      institution: this.institution,
      assets: this.assets ?? [],
      requirements: this.requirements ?? [],
      faqs: this.faqs ?? [],
    };
  }
}
