import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { asset_format } from '@prisma/client';
import { InstitutionNotFoundException } from '../common/exceptions/institution-not-found.exception.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UploadCampaignAssetsDto } from './dto/upload-campaign-assets.dto.js';
import { CampaignAssetEntity } from './entities/campaign-asset.entity.js';
import { CampaignEntity } from './entities/campaign.entity.js';
import { CampaignAssetRepository } from './repositories/campaign-asset.repository.js';
import { CampaignRepository } from './repositories/campaign.repository.js';
import { parseBase64Image } from './utils/base64-image.util.js';
import { generateCampaignSlug } from './utils/slug.util.js';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignAssetRepository: CampaignAssetRepository,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Crea un nuevo pedido básico de donación persistiendo en Supabase con UUID y slug único.
   * Cumple con US-01, ST-03, ST-04 y ST-05.
   */
  async create(dto: CreateCampaignDto): Promise<CampaignEntity> {
    this.logger.log(
      `Iniciando creación de pedido para paciente '${dto.patientName}' en institución '${dto.institutionId}'`,
    );

    // 1. Validar que la institución (centro de salud) exista y esté activa
    const institutionExists = await this.campaignRepository.institutionExists(
      dto.institutionId,
    );
    if (!institutionExists) {
      this.logger.warn(
        `Institución con ID '${dto.institutionId}' no existe o está inactiva.`,
      );
      throw new InstitutionNotFoundException(dto.institutionId);
    }

    // 2. Generar UUID único para la entidad
    const campaignId = randomUUID();

    // 3. Generar un edit_token seguro para permitir edición futura sin autenticación obligatoria
    const editToken = randomUUID();

    // 4. Generar slug único garantizando ausencia de colisiones
    const slug = await this.generateUniqueSlug(dto.patientName);

    // 5. Normalizar campos opcionales
    const deadlineDate = dto.deadline ? new Date(dto.deadline) : undefined;

    // 6. Persistir en la base de datos a través del repositorio
    const campaign = await this.campaignRepository.create({
      id: campaignId,
      slug,
      editToken,
      institutionId: dto.institutionId,
      patientName: dto.patientName,
      bloodType: dto.bloodType,
      donationType: dto.donationType,
      targetDonors: dto.targetDonors,
      deadline: deadlineDate,
      observations: dto.observations,
    });

    this.logger.log(
      `Pedido de donación creado exitosamente: ${campaign.id} (${campaign.slug})`,
    );
    return campaign;
  }

  /**
   * Obtiene una campaña por su UUID.
   */
  async findById(id: string): Promise<CampaignEntity> {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) {
      throw new NotFoundException(
        `No se encontró el pedido de donación con ID '${id}'.`,
      );
    }
    return campaign;
  }

  /**
   * Obtiene una campaña por su slug amigable.
   */
  async findBySlug(slug: string): Promise<CampaignEntity> {
    const campaign = await this.campaignRepository.findBySlug(slug);
    if (!campaign) {
      throw new NotFoundException(
        `No se encontró el pedido de donación con slug '${slug}'.`,
      );
    }
    return campaign;
  }

  /**
   * Guarda y almacena en Supabase Storage las placas generadas en el frontend (US-03, US-04).
   * Valida la existencia de la campaña y verifica que el editToken coincida con el registrado.
   * Persiste los registros en la tabla campaign_asset.
   */
  async uploadAssets(
    campaignId: string,
    dto: UploadCampaignAssetsDto,
  ): Promise<CampaignAssetEntity[]> {
    this.logger.log(
      `Iniciando subida de ${dto.assets.length} placas para la campaña '${campaignId}'`,
    );

    // 1. Validar existencia de la campaña
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundException(
        `No se encontró el pedido de donación con ID '${campaignId}'.`,
      );
    }

    // 2. Validar editToken para autorizar la operación
    if (campaign.editToken !== dto.editToken.trim()) {
      this.logger.warn(
        `Intento no autorizado de registrar placas en campaña '${campaignId}'. Token incorrecto.`,
      );
      throw new ForbiddenException(
        'El editToken proporcionado no es válido para autorizar cambios en este pedido de donación.',
      );
    }

    // 3. Procesar y almacenar cada placa
    const defaultDimensions: Record<
      asset_format,
      { width: number; height: number }
    > = {
      SQUARE_1_1: { width: 1080, height: 1080 },
      STORY_9_16: { width: 1080, height: 1920 },
    };

    const savedAssets: CampaignAssetEntity[] = [];

    for (const item of dto.assets) {
      const { buffer, contentType, extension } = parseBase64Image(
        item.imageBase64,
      );

      const width = item.width ?? defaultDimensions[item.format].width;
      const height = item.height ?? defaultDimensions[item.format].height;

      // Ruta en el bucket: {campaignId}/{format}.{ext}
      const storagePath = `${campaignId}/${item.format.toLowerCase()}.${extension}`;

      const publicUrl = await this.storageService.uploadFile(
        storagePath,
        buffer,
        contentType,
      );

      const asset = await this.campaignAssetRepository.save({
        campaignId,
        format: item.format,
        imageUrl: publicUrl,
        width,
        height,
      });

      savedAssets.push(asset);
    }

    this.logger.log(
      `Se registraron exitosamente ${savedAssets.length} placas para la campaña '${campaignId}'`,
    );
    return savedAssets;
  }

  /**
   * Genera un slug y verifica que no exista colisión en la base de datos.
   */
  private async generateUniqueSlug(
    patientName: string,
    maxAttempts = 5,
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = generateCampaignSlug(patientName);
      const existing = await this.campaignRepository.findBySlug(candidate);
      if (!existing) {
        return candidate;
      }
      this.logger.warn(
        `Colisión detectada para slug '${candidate}', reintentando... (intento ${attempt + 1})`,
      );
    }

    // Si aún hay colisión, agregar timestamp adicional
    return generateCampaignSlug(`${patientName}-${Date.now().toString(36)}`);
  }
}
