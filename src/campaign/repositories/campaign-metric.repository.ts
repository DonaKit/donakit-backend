import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

export interface CreateCampaignMetricData {
  campaignId: string;
  deviceType?: string | null;
  referrer?: string | null;
  ipHash?: string | null;
}

@Injectable()
export class CampaignMetricRepository {
  private readonly logger = new Logger(CampaignMetricRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste un registro de visita en la tabla campaign_metric (US-19).
   */
  async create(data: CreateCampaignMetricData) {
    this.logger.log(
      `Registrando visita en campaign_metric: campaign='${data.campaignId}', device='${data.deviceType ?? 'UNKNOWN'}', ref='${data.referrer ?? 'DIRECT'}'`,
    );

    return this.prisma.campaign_metric.create({
      data: {
        campaign_id: data.campaignId,
        device_type: data.deviceType ?? 'UNKNOWN',
        referrer: data.referrer ?? 'DIRECT',
        ip_hash: data.ipHash ?? null,
      },
    });
  }

  /**
   * Retorna el conteo total de visitas de una campaña.
   */
  async countByCampaignId(campaignId: string): Promise<number> {
    return this.prisma.campaign_metric.count({
      where: { campaign_id: campaignId },
    });
  }

  /**
   * Retorna los registros de visitas de una campaña ordenados cronológicamente.
   */
  async findByCampaignId(campaignId: string) {
    return this.prisma.campaign_metric.findMany({
      where: { campaign_id: campaignId },
      orderBy: { visited_at: 'desc' },
    });
  }
}
