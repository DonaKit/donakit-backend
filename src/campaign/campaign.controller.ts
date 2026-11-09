import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CampaignService } from './campaign.service.js';
import { CampaignAssetsResponseDto } from './dto/campaign-assets-response.dto.js';
import { CampaignDashboardResponseDto } from './dto/campaign-dashboard-item.dto.js';
import { CampaignResponseDto } from './dto/campaign-response.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { PublicCampaignResponseDto } from './dto/public-campaign.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import { UploadCampaignAssetsDto } from './dto/upload-campaign-assets.dto.js';
import { VerifyEditTokenDto } from './dto/verify-edit-token.dto.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /**
   * Endpoint para generar un nuevo pedido de donación (US-01 / ST-03, ST-04, ST-05).
   * Valida campos obligatorios: paciente, centro de salud y grupo sanguíneo.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.campaignService.create(createCampaignDto);

    return {
      success: true,
      message: 'Pedido de donación creado exitosamente.',
      data: campaign,
    };
  }

  /**
   * Endpoint para registrar y confirmar placas gráficas generadas en el frontend (US-03, US-04, US-07).
   * Almacena las imágenes en Supabase Storage, persiste o actualiza en campaign_asset,
   * confirma el pedido (DRAFT -> ACTIVE) y registra eventos en download_log.
   * Requiere el editToken para validar que la petición provenga del creador del borrador.
   */
  @Post(':id/assets')
  @HttpCode(HttpStatus.CREATED)
  async uploadAssets(
    @Param('id') id: string,
    @Body() uploadAssetsDto: UploadCampaignAssetsDto,
    @Req() req: Request,
  ): Promise<CampaignAssetsResponseDto> {
    if (!UUID_V4_REGEX.test(id)) {
      throw new BadRequestException(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    }

    const clientIp =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      req.socket?.remoteAddress;

    const assets = await this.campaignService.uploadAssets(
      id,
      uploadAssetsDto,
      clientIp,
    );

    return {
      success: true,
      message: 'Placas del pedido registradas y almacenadas exitosamente.',
      data: assets,
    };
  }

  /**
   * Endpoint para corregir o modificar los datos de un pedido de donación (US-09).
   * Requiere el editToken para validar la autorización del difusor.
   * Si cambia el nombre del paciente, regenera automáticamente el slug único.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    if (!UUID_V4_REGEX.test(id)) {
      throw new BadRequestException(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    }

    const campaign = await this.campaignService.update(id, updateCampaignDto);

    return {
      success: true,
      message: 'Pedido de donación actualizado exitosamente.',
      data: campaign,
    };
  }

  /**
   * Endpoint para validar si un editToken es correcto y recuperar los datos del borrador (US-09).
   * Devuelve 200 OK con los datos completos si el token es válido, o 403 Forbidden si es incorrecto.
   */
  @Post(':id/verify-token')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Param('id') id: string,
    @Body() verifyDto: VerifyEditTokenDto,
  ): Promise<CampaignResponseDto> {
    if (!UUID_V4_REGEX.test(id)) {
      throw new BadRequestException(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    }

    const campaign = await this.campaignService.verifyEditToken(
      id,
      verifyDto.editToken,
    );

    return {
      success: true,
      message: 'Token de edición validado exitosamente.',
      data: campaign,
    };
  }

  /**
   * Endpoint específico para consultar los requisitos aplicables a la campaña (US-12).
   * Permite filtrar por categoría o solo inhabilitaciones inmediatas (?immediateOnly=true).
   */
  @Get(':idOrSlug/requirements')
  async getRequirements(
    @Param('idOrSlug') idOrSlug: string,
    @Query('category') category?: string,
    @Query('immediateOnly') immediateOnly?: string,
  ) {
    const isImmediate =
      immediateOnly !== undefined
        ? immediateOnly === 'true' || immediateOnly === '1'
        : undefined;

    const requirements = await this.campaignService.getRequirements(
      idOrSlug,
      category,
      isImmediate,
    );

    return {
      success: true,
      message: 'Requisitos de donación obtenidos exitosamente.',
      data: requirements,
    };
  }

  /**
   * Endpoint específico para consultar las preguntas frecuentes aplicables a la campaña (US-13).
   * Permite filtrar por categoría (?category=TATUAJES, MEDICACION, HEPATITIS, etc.).
   */
  @Get(':idOrSlug/faqs')
  async getFaqs(
    @Param('idOrSlug') idOrSlug: string,
    @Query('category') category?: string,
  ) {
    const faqs = await this.campaignService.getFaqs(idOrSlug, category);

    return {
      success: true,
      message: 'Preguntas frecuentes obtenidas exitosamente.',
      data: faqs,
    };
  }

  /**
   * Endpoint específico para registrar una visita en la landing page (US-19).
   * Permite registrar explícitamente el evento tras cargar la página.
   */
  @Post(':idOrSlug/visit')
  @HttpCode(HttpStatus.OK)
  async recordVisit(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: Request,
    @Body('referrer') bodyReferrer?: string,
  ) {
    const campaign = await this.campaignService.findByIdOrSlug(idOrSlug);

    const clientIp =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    const userAgent = req.headers?.['user-agent'] as string | undefined;
    const referrer =
      bodyReferrer ||
      (req.query?.referrer as string) ||
      (req.headers?.['referer'] as string) ||
      (req.headers?.['referrer'] as string) ||
      'DIRECT';

    await this.campaignService.recordVisit(
      campaign.id,
      clientIp,
      userAgent,
      referrer,
    );

    return {
      success: true,
      message: 'Visita registrada exitosamente.',
    };
  }

  /**
   * Endpoint para consultar el contador de visitas de una campaña (US-19).
   * Requiere el editToken para garantizar que solo la institución o difusor autorizado acceda.
   */
  @Get(':idOrSlug/metrics')
  async getMetrics(
    @Param('idOrSlug') idOrSlug: string,
    @Query('editToken') editToken?: string,
  ) {
    const campaign = await this.campaignService.findByIdOrSlug(idOrSlug);

    if (!editToken || campaign.editToken !== editToken.trim()) {
      throw new ForbiddenException(
        'El editToken es requerido y debe ser válido para consultar las métricas de la campaña.',
      );
    }

    const totalVisits = await this.campaignService.getVisitCount(campaign.id);

    return {
      success: true,
      message: 'Métricas de campaña obtenidas exitosamente.',
      data: {
        campaignId: campaign.id,
        totalVisits,
      },
    };
  }

  /**
   * Endpoint para listar las campañas en el panel de reportería / dashboard (US-20).
   * Devuelve las solicitudes y campañas activas con información clave:
   * nombre del paciente, fechas, estado, avance de donantes y total de visitas.
   */
  @Get()
  async findDashboard(
    @Query('institutionId') institutionId?: string,
    @Query('status') status?: string,
  ): Promise<CampaignDashboardResponseDto> {
    const campaigns = await this.campaignService.findDashboardCampaigns({
      institutionId,
      status,
    });

    return {
      success: true,
      message:
        'Listado de campañas para panel administrativo obtenido exitosamente.',
      data: campaigns,
      total: campaigns.length,
    };
  }

  /**
   * Obtiene los detalles de un pedido de donación por su UUID o su slug amigable.
   * Por defecto responde con el DTO público enriquecido para la landing page (US-11, US-12, US-13, US-14, US-15, US-19).
   * Si se envía el parámetro ?editToken=... válido, responde con la entidad completa para edición.
   * Registra automáticamente el evento de visita si es una consulta pública (US-19).
   */
  @Get(':idOrSlug')
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
    @Query('editToken') editToken?: string,
    @Req() req?: Request,
  ): Promise<PublicCampaignResponseDto | CampaignResponseDto> {
    const isUuid = UUID_V4_REGEX.test(idOrSlug);
    const campaign = isUuid
      ? await this.campaignService.findById(idOrSlug)
      : await this.campaignService.findBySlug(idOrSlug);

    if (editToken) {
      if (campaign.editToken !== editToken.trim()) {
        throw new ForbiddenException(
          'El token de edición proporcionado no es válido para esta campaña.',
        );
      }
      return {
        success: true,
        message: 'Pedido de donación obtenido exitosamente en modo edición.',
        data: campaign,
      };
    }

    // US-19: Registrar evento de visita anónima al cargar la página pública
    if (req) {
      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.ip ||
        req.socket?.remoteAddress;
      const userAgent = req.headers?.['user-agent'] as string | undefined;
      const rawReferrer =
        (req.query?.referrer as string) ||
        (req.query?.from as string) ||
        (req.headers?.['referer'] as string) ||
        (req.headers?.['referrer'] as string) ||
        'DIRECT';

      void this.campaignService.recordVisit(
        campaign.id,
        clientIp,
        userAgent,
        rawReferrer,
      );
    }

    return {
      success: true,
      message: 'Pedido de donación obtenido exitosamente.',
      data: campaign.toPublic(),
    };
  }
}
