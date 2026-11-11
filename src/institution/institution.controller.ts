import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { CampaignService } from '../campaign/campaign.service.js';
import { AdminUpdateCampaignDto } from '../campaign/dto/admin-update-campaign.dto.js';
import type { CampaignDashboardResponseDto } from '../campaign/dto/campaign-dashboard-item.dto.js';
import type { CampaignResponseDto } from '../campaign/dto/campaign-response.dto.js';
import type { InstitutionItemDto } from './dto/institution-item.dto.js';
import { InstitutionService } from './institution.service.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('institutions')
export class InstitutionController {
  constructor(
    private readonly institutionService: InstitutionService,
    private readonly campaignService: CampaignService,
  ) {}

  /**
   * Endpoint para listar centros de salud activos acotados para selección en combobox.
   * Devuelve directamente el listado (array) de instituciones sin envoltorios redundantes.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<InstitutionItemDto[]> {
    return this.institutionService.findAll();
  }

  /**
   * Endpoint para listar las campañas de una institución específica para el dashboard (US-20).
   * Por defecto filtra las campañas abiertas/activas (o según query param ?status=...).
   */
  @Get(':id/campaigns')
  @UseGuards(AdminAuthGuard)
  async findCampaigns(
    @Param('id') id: string,
    @Query('status') status?: string,
  ): Promise<CampaignDashboardResponseDto> {
    const campaigns = await this.campaignService.findDashboardCampaigns({
      institutionId: id,
      status,
    });

    return {
      success: true,
      message: 'Listado de campañas de la institución obtenido exitosamente.',
      data: campaigns,
      total: campaigns.length,
    };
  }

  /**
   * Endpoint para que el administrador de la institución consulte los detalles completos de una campaña (US-20).
   * Devuelve la entidad completa con total de visitas, requisitos y avance sin exigir el editToken familiar.
   */
  @Get(':institutionId/campaigns/:campaignId')
  @UseGuards(AdminAuthGuard)
  async findOneCampaign(
    @Param('institutionId') institutionId: string,
    @Param('campaignId') campaignId: string,
  ): Promise<CampaignResponseDto> {
    if (!UUID_V4_REGEX.test(institutionId)) {
      throw new BadRequestException(
        'El identificador de la institución debe ser un UUID v4 válido.',
      );
    }
    if (!UUID_V4_REGEX.test(campaignId)) {
      throw new BadRequestException(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    }

    const campaign = await this.campaignService.adminFindOne(
      institutionId,
      campaignId,
    );

    return {
      success: true,
      message: 'Detalle de la campaña obtenido exitosamente.',
      data: campaign,
    };
  }

  /**
   * Endpoint para que el administrador de la institución actualice la campaña (US-16, US-20).
   * Permite cerrar la campaña (status: 'COMPLETED'), modificar donantes alcanzados (currentDonors),
   * o ajustar plazos y observaciones, y pulsar "Guardar".
   */
  @Patch(':institutionId/campaigns/:campaignId')
  @UseGuards(AdminAuthGuard)
  async updateCampaign(
    @Param('institutionId') institutionId: string,
    @Param('campaignId') campaignId: string,
    @Body() adminUpdateDto: AdminUpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    if (!UUID_V4_REGEX.test(institutionId)) {
      throw new BadRequestException(
        'El identificador de la institución debe ser un UUID v4 válido.',
      );
    }
    if (!UUID_V4_REGEX.test(campaignId)) {
      throw new BadRequestException(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    }

    const updated = await this.campaignService.adminUpdate(
      institutionId,
      campaignId,
      adminUpdateDto,
    );

    return {
      success: true,
      message: 'Campaña actualizada exitosamente por la institución.',
      data: updated,
    };
  }
}
