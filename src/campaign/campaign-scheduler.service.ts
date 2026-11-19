import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignRepository } from './repositories/campaign.repository.js';

/**
 * Tarea programada en segundo plano para la expiración automática de campañas vencidas (BUG-04).
 */
@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(private readonly campaignRepository: CampaignRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expirarCampaniasVencidas(): Promise<void> {
    this.logger.log(
      'Ejecutando tarea programada: expiración de campañas vencidas (EVERY_DAY_AT_MIDNIGHT)',
    );
    try {
      const expiredCount =
        await this.campaignRepository.expireOverdueCampaigns();
      this.logger.log(
        `Tarea programada finalizada: ${expiredCount} campañas actualizadas a EXPIRED.`,
      );
    } catch (error) {
      this.logger.error(
        'Error al ejecutar la tarea programada de expiración de campañas:',
        error,
      );
    }
  }
}
