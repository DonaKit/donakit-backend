import { Injectable, Logger } from '@nestjs/common';
import type { asset_format } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CampaignAssetEntity } from '../entities/campaign-asset.entity.js';

export interface SaveAssetData {
  campaignId: string;
  format: asset_format;
  imageUrl: string;
  width: number;
  height: number;
}

@Injectable()
export class CampaignAssetRepository {
  private readonly logger = new Logger(CampaignAssetRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda o actualiza un asset asociado a una campaña y formato.
   * Si ya existe un asset para ese (campaign_id, format), actualiza su URL y dimensiones.
   * Si no existe, crea un nuevo registro.
   */
  async save(data: SaveAssetData): Promise<CampaignAssetEntity> {
    const existing = await this.prisma.campaign_asset.findFirst({
      where: {
        campaign_id: data.campaignId,
        format: data.format,
      },
    });

    if (existing) {
      this.logger.log(
        `Actualizando asset existente con ID ${existing.id} (${data.format}) para campaña ${data.campaignId}`,
      );
      const updated = await this.prisma.campaign_asset.update({
        where: { id: existing.id },
        data: {
          image_url: data.imageUrl,
          width: data.width,
          height: data.height,
        },
      });
      return this.mapToEntity(updated);
    }

    this.logger.log(
      `Creando nuevo asset (${data.format}) para campaña ${data.campaignId}`,
    );
    const created = await this.prisma.campaign_asset.create({
      data: {
        campaign_id: data.campaignId,
        format: data.format,
        image_url: data.imageUrl,
        width: data.width,
        height: data.height,
      },
    });

    return this.mapToEntity(created);
  }

  /**
   * Obtiene todos los assets pertenecientes a una campaña.
   */
  async findByCampaignId(campaignId: string): Promise<CampaignAssetEntity[]> {
    const records = await this.prisma.campaign_asset.findMany({
      where: { campaign_id: campaignId },
      orderBy: { format: 'asc' },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  private mapToEntity(record: {
    id: string;
    campaign_id: string;
    format: asset_format;
    image_url: string;
    width: number;
    height: number;
    created_at: Date;
  }): CampaignAssetEntity {
    return new CampaignAssetEntity({
      id: record.id,
      campaignId: record.campaign_id,
      format: record.format,
      imageUrl: record.image_url,
      width: record.width,
      height: record.height,
      createdAt: record.created_at,
    });
  }
}

