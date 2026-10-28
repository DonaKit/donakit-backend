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
    };
  }
}
