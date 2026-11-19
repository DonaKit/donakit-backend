import type { campaign_status } from '@prisma/client';

export class CampaignDashboardInstitutionDto {
  id: string;
  name: string;
  city: string;
}

export class CampaignDashboardItemDto {
  id: string;
  slug: string;
  patientName: string;
  bloodType: string;
  donationType: string | null;
  status: campaign_status;
  createdAt: Date;
  deadline: Date | null;
  targetDonors: number | null;
  currentDonors: number | null;
  progressPercentage: number | null;
  totalVisits: number;
  institution?: CampaignDashboardInstitutionDto | null;
}

export class CampaignDashboardSummaryDto {
  totalCampanias: number;
  activas: number;
  totalVisitas: number;
  donantesConseguidos: number;
}

export class CampaignDashboardResponseDto {
  success: boolean;
  message: string;
  data: CampaignDashboardItemDto[];
  total: number;
  summary?: CampaignDashboardSummaryDto;
}
