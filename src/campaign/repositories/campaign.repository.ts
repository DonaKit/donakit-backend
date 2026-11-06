import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CampaignAssetEntity } from '../entities/campaign-asset.entity.js';
import { CampaignEntity } from '../entities/campaign.entity.js';
import { FaqItemEntity } from '../entities/faq-item.entity.js';
import { RequirementEntity } from '../entities/requirement.entity.js';
import type {
  CreateCampaignData,
  ICampaignRepository,
  UpdateCampaignData,
} from '../interfaces/campaign-repository.interface.js';

@Injectable()
export class CampaignRepository implements ICampaignRepository {
  private readonly logger = new Logger(CampaignRepository.name);

  private readonly institutionSelect = {
    id: true,
    name: true,
    address: true,
    city: true,
    phone: true,
    whatsapp: true,
    email: true,
    website_url: true,
    requirements_url: true,
    faq_url: true,
    business_hours: true,
    specific_requirements: true,
    logo_url: true,
  };

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
      generated_copy: data.generatedCopy ?? null,
      status: data.status ?? 'DRAFT',
      institution: {
        connect: { id: data.institutionId },
      },
    };

    const record = await this.prisma.campaign.create({
      data: prismaCreateData,
      include: {
        institution: {
          select: this.institutionSelect,
        },
      },
    });

    this.logger.log(
      `Campaña creada exitosamente con ID ${record.id} y slug '${record.slug}'`,
    );
    return this.mapToEntity(record);
  }

  /**
   * Busca una campaña por su UUID con datos completos para la landing page.
   */
  async findById(id: string): Promise<CampaignEntity | null> {
    const record = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        institution: {
          select: this.institutionSelect,
        },
        campaign_asset: true,
      },
    });

    if (!record) {
      return null;
    }

    const [requirements, faqs] = await Promise.all([
      this.findRequirements(record.institution_id),
      this.findFaqs(record.institution_id),
    ]);

    return this.mapToEntity(record, requirements, faqs);
  }

  /**
   * Busca una campaña por su slug amigable con datos completos para la landing page.
   */
  async findBySlug(slug: string): Promise<CampaignEntity | null> {
    const record = await this.prisma.campaign.findUnique({
      where: { slug },
      include: {
        institution: {
          select: this.institutionSelect,
        },
        campaign_asset: true,
      },
    });

    if (!record) {
      return null;
    }

    const [requirements, faqs] = await Promise.all([
      this.findRequirements(record.institution_id),
      this.findFaqs(record.institution_id),
    ]);

    return this.mapToEntity(record, requirements, faqs);
  }

  /**
   * Consulta los requisitos generales y específicos aplicables a la institución.
   */
  async findRequirements(
    institutionId?: string,
    category?: string,
    immediateOnly?: boolean,
  ): Promise<RequirementEntity[]> {
    const where: Prisma.requirementWhereInput = {
      ...(institutionId
        ? {
            OR: [{ institution_id: null }, { institution_id: institutionId }],
          }
        : { institution_id: null }),
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      ...(immediateOnly !== undefined
        ? { is_immediate_disqualification: immediateOnly }
        : {}),
    };

    const records = await this.prisma.requirement.findMany({
      where,
      orderBy: [{ display_order: 'asc' }, { title: 'asc' }],
    });

    return records.map(
      (r) =>
        new RequirementEntity({
          id: r.id,
          institutionId: r.institution_id,
          title: r.title,
          description: r.description,
          isImmediateDisqualification: r.is_immediate_disqualification,
          category: r.category,
          displayOrder: r.display_order,
        }),
    );
  }

  /**
   * Consulta las preguntas frecuentes generales y específicas aplicables a la institución.
   */
  async findFaqs(
    institutionId?: string,
    category?: string,
  ): Promise<FaqItemEntity[]> {
    const where: Prisma.faq_itemWhereInput = {
      ...(institutionId
        ? {
            OR: [{ institution_id: null }, { institution_id: institutionId }],
          }
        : { institution_id: null }),
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
    };

    const records = await this.prisma.faq_item.findMany({
      where,
      orderBy: [{ display_order: 'asc' }, { question: 'asc' }],
    });

    return records.map(
      (f) =>
        new FaqItemEntity({
          id: f.id,
          institutionId: f.institution_id,
          question: f.question,
          answer: f.answer,
          category: f.category,
          displayOrder: f.display_order,
        }),
    );
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
   * Actualiza el estado de una campaña (ej. de DRAFT a ACTIVE al confirmar).
   */
  async updateStatus(
    id: string,
    status: Prisma.campaignUpdateInput['status'],
  ): Promise<CampaignEntity> {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status },
      include: {
        institution: {
          select: this.institutionSelect,
        },
        campaign_asset: true,
      },
    });

    return this.mapToEntity(updated);
  }

  /**
   * Actualiza los datos de una campaña existente (US-09).
   */
  async update(id: string, data: UpdateCampaignData): Promise<CampaignEntity> {
    const prismaUpdateData: Prisma.campaignUpdateInput = {
      ...(data.patientName !== undefined ? { patient_name: data.patientName } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.bloodType !== undefined ? { blood_type: data.bloodType } : {}),
      ...(data.donationType !== undefined ? { donation_type: data.donationType } : {}),
      ...(data.targetDonors !== undefined ? { target_donors: data.targetDonors } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline } : {}),
      ...(data.observations !== undefined ? { observations: data.observations } : {}),
      ...(data.generatedCopy !== undefined
        ? { generated_copy: data.generatedCopy }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.institutionId !== undefined
        ? {
            institution: {
              connect: { id: data.institutionId },
            },
          }
        : {}),
    };

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: prismaUpdateData,
      include: {
        institution: {
          select: this.institutionSelect,
        },
        campaign_asset: true,
      },
    });

    this.logger.log(`Campaña con ID '${id}' actualizada exitosamente.`);
    return this.mapToEntity(updated);
  }

  /**
   * Mapea un registro raw de Prisma al modelo de dominio CampaignEntity.
   */
  private mapToEntity(
    record: any,
    requirements: RequirementEntity[] = [],
    faqs: FaqItemEntity[] = [],
  ): CampaignEntity {
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
            phone: record.institution.phone ?? null,
            whatsapp: record.institution.whatsapp ?? null,
            email: record.institution.email ?? null,
            websiteUrl: record.institution.website_url ?? null,
            requirementsUrl: record.institution.requirements_url ?? null,
            faqUrl: record.institution.faq_url ?? null,
            businessHours: record.institution.business_hours ?? null,
            specificRequirements:
              record.institution.specific_requirements ?? null,
            logoUrl: record.institution.logo_url ?? null,
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
      requirements,
      faqs,
    });
  }
}

