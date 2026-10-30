import { Injectable, Logger } from '@nestjs/common';
import type { download_type } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface CreateDownloadLogData {
  campaignId: string;
  downloadType: download_type;
  ipHash?: string | null;
}

@Injectable()
export class DownloadLogRepository {
  private readonly logger = new Logger(DownloadLogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste un registro de auditoría de descarga de placas o bundle en download_log (US-07/ST-03).
   */
  async create(data: CreateDownloadLogData) {
    this.logger.log(
      `Registrando evento de descarga en download_log: campaign='${data.campaignId}', type='${data.downloadType}'`,
    );

    return this.prisma.download_log.create({
      data: {
        campaign_id: data.campaignId,
        download_type: data.downloadType,
        ip_hash: data.ipHash ?? null,
      },
    });
  }

  /**
   * Retorna el conteo total de descargas de una campaña.
   */
  async countByCampaignId(campaignId: string): Promise<number> {
    return this.prisma.download_log.count({
      where: { campaign_id: campaignId },
    });
  }

  /**
   * Lista los eventos de descarga de una campaña.
   */
  async findByCampaignId(campaignId: string) {
    return this.prisma.download_log.findMany({
      where: { campaign_id: campaignId },
      orderBy: { downloaded_at: 'desc' },
    });
  }
}

