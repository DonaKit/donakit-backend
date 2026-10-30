import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CampaignService } from './campaign.service.js';
import { CampaignAssetsResponseDto } from './dto/campaign-assets-response.dto.js';
import { CampaignResponseDto } from './dto/campaign-response.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { PublicCampaignResponseDto } from './dto/public-campaign.dto.js';
import { UploadCampaignAssetsDto } from './dto/upload-campaign-assets.dto.js';

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
   * Endpoint para registrar las placas gráficas generadas en el frontend (US-03, US-04).
   * Almacena las imágenes en Supabase Storage y persiste las referencias en la tabla campaign_asset.
   * Requiere el editToken para validar que la petición provenga del creador del borrador.
   */
  @Post(':id/assets')
  @HttpCode(HttpStatus.CREATED)
  async uploadAssets(
    @Param('id') id: string,
    @Body() uploadAssetsDto: UploadCampaignAssetsDto,
  ): Promise<CampaignAssetsResponseDto> {
    if (!UUID_V4_REGEX.test(id)) {
      throw new BadRequestException(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    }

    const assets = await this.campaignService.uploadAssets(id, uploadAssetsDto);

    return {
      success: true,
      message: 'Placas del pedido registradas y almacenadas exitosamente.',
      data: assets,
    };
  }

  /**
   * Obtiene los detalles públicos de un pedido de donación por su UUID o su slug amigable.
   * Por seguridad, no expone el editToken ni el slug en la respuesta pública.
   */
  @Get(':idOrSlug')
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<PublicCampaignResponseDto> {
    const isUuid = UUID_V4_REGEX.test(idOrSlug);
    const campaign = isUuid
      ? await this.campaignService.findById(idOrSlug)
      : await this.campaignService.findBySlug(idOrSlug);

    return {
      success: true,
      message: 'Pedido de donación obtenido exitosamente.',
      data: campaign.toPublic(),
    };
  }
}
