import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CampaignService } from './campaign.service.js';
import { CampaignResponseDto } from './dto/campaign-response.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';

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
   * Obtiene los detalles de un pedido de donación por su UUID o su slug amigable.
   */
  @Get(':idOrSlug')
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<CampaignResponseDto> {
    const isUuid = UUID_V4_REGEX.test(idOrSlug);
    const campaign = isUuid
      ? await this.campaignService.findById(idOrSlug)
      : await this.campaignService.findBySlug(idOrSlug);

    return {
      success: true,
      message: 'Pedido de donación obtenido exitosamente.',
      data: campaign,
    };
  }
}
