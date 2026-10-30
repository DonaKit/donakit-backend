import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CampaignAssetEntity } from '../entities/campaign-asset.entity.js';
import { CampaignEntity } from '../entities/campaign.entity.js';
import type {
  CreateCampaignData,
  ICampaignRepository,
} from '../interfaces/campaign-repository.interface.js';

@Injectable()
export class CampaignRepository implements ICampaignRepository {
  private readonly logger = new Logger(CampaignRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste una nueva campaña en la base de datos de Supabase.
   */
  async create(data: CreateCampaignData): Promise<CampaignEntity> {
    const prismaCreateData: Prisma.campaignCreateInput = {
      ...(data.id ? { id: data.id } : {}),
      slug: data.slug,
      edit_token: data.editToken,
      patient_name: data.patientName,
      blood_type: data.bloodType,
      donation_type: data.donationType ?? 'Sangre entera',
      target_donors: data.targetDonors ?? null,
      deadline: data.deadline ?? null,
      observations: data.observations ?? null,
      status: data.status ?? 'DRAFT',
      institution: {
        connect: { id: data.institutionId },
      },
    };

    const record = await this.prisma.campaign.create({
      data: prismaCreateData,
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    this.logger.log(
      `Campaña creada exitosamente con ID ${record.id} y slug '${record.slug}'`,
    );
    return this.mapToEntity(record);
  }

  /**
   * Busca una campaña por su UUID.
   */
  async findById(id: string): Promise<CampaignEntity | null> {
    const record = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        campaign_asset: true,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Busca una campaña por su slug amigable.
   */
  async findBySlug(slug: string): Promise<CampaignEntity | null> {
    const record = await this.prisma.campaign.findUnique({
      where: { slug },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        campaign_asset: true,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Verifica la existencia y estado activo de un centro de salud.
   */
  async institutionExists(institutionId: string): Promise<boolean> {
    const count = await this.prisma.institution.count({
      where: {
        id: institutionId,
        is_active: true,
      },
    });

    return count > 0;
  }

  /**
   * Obtiene los datos de una institución por su ID.
   */
  async getInstitutionById(institutionId: string) {
    return this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
  }

  /**
   * Mapea un registro raw de Prisma al modelo de dominio CampaignEntity.
   */
  private mapToEntity(record: any): CampaignEntity {
    return new CampaignEntity({
      id: record.id,
      slug: record.slug,
      editToken: record.edit_token,
      institutionId: record.institution_id,
      patientName: record.patient_name,
      bloodType: record.blood_type,
      donationType: record.donation_type,
      targetDonors: record.target_donors,
      currentDonors: record.current_donors,
      deadline: record.deadline,
      observations: record.observations,
      generatedCopy: record.generated_copy,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      institution: record.institution
        ? {
            id: record.institution.id,
            name: record.institution.name,
            address: record.institution.address,
            city: record.institution.city,
          }
        : undefined,
      assets: Array.isArray(record.campaign_asset)
        ? record.campaign_asset.map(
            (a: any) =>
              new CampaignAssetEntity({
                id: a.id,
                campaignId: a.campaign_id,
                format: a.format,
                imageUrl: a.image_url,
                width: a.width,
                height: a.height,
                createdAt: a.created_at,
              }),
          )
        : undefined,
    });
  }
}
