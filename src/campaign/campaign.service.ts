import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  asset_format,
  campaign_status,
  download_type,
} from '@prisma/client';
import { InstitutionNotFoundException } from '../common/exceptions/institution-not-found.exception.js';
import { StorageService } from '../storage/storage.service.js';
import type { AdminUpdateCampaignDto } from './dto/admin-update-campaign.dto.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import type { UploadCampaignAssetsDto } from './dto/upload-campaign-assets.dto.js';
import { CampaignAssetEntity } from './entities/campaign-asset.entity.js';
import { CampaignEntity } from './entities/campaign.entity.js';
import type { CampaignDashboardItemDto } from './dto/campaign-dashboard-item.dto.js';
import type { FaqItemEntity } from './entities/faq-item.entity.js';
import type { RequirementEntity } from './entities/requirement.entity.js';
import { CampaignAssetRepository } from './repositories/campaign-asset.repository.js';
import { CampaignMetricRepository } from './repositories/campaign-metric.repository.js';
import { CampaignRepository } from './repositories/campaign.repository.js';
import { DownloadLogRepository } from './repositories/download-log.repository.js';
import { parseBase64Image } from './utils/base64-image.util.js';
import { hashIp } from './utils/hash.util.js';
import { generateCampaignSlug } from './utils/slug.util.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ASSET_TO_DOWNLOAD_TYPE: Record<asset_format, download_type> = {
  SQUARE_1_1: 'IMAGE_1_1',
  STORY_9_16: 'IMAGE_9_16',
};

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignAssetRepository: CampaignAssetRepository,
    private readonly downloadLogRepository: DownloadLogRepository,
    private readonly storageService: StorageService,
    private readonly campaignMetricRepository?: CampaignMetricRepository,
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
      generatedCopy: dto.generatedCopy,
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
   * Obtiene un pedido de donación por su UUID o slug amigable.
   */
  async findByIdOrSlug(idOrSlug: string): Promise<CampaignEntity> {
    const isUuid = UUID_V4_REGEX.test(idOrSlug);
    return isUuid ? this.findById(idOrSlug) : this.findBySlug(idOrSlug);
  }

  /**
   * Obtiene los requisitos aplicables a un pedido de donación (US-12).
   */
  async getRequirements(
    idOrSlug: string,
    category?: string,
    immediateOnly?: boolean,
  ): Promise<RequirementEntity[]> {
    const campaign = await this.findByIdOrSlug(idOrSlug);
    return this.campaignRepository.findRequirements(
      campaign.institutionId,
      category,
      immediateOnly,
    );
  }

  /**
   * Obtiene las preguntas frecuentes aplicables a un pedido de donación (US-13).
   */
  async getFaqs(idOrSlug: string, category?: string): Promise<FaqItemEntity[]> {
    const campaign = await this.findByIdOrSlug(idOrSlug);
    return this.campaignRepository.findFaqs(campaign.institutionId, category);
  }

  /**
   * Registra una visita en la landing page de la campaña (US-19).
   */
  async recordVisit(
    campaignId: string,
    clientIp?: string | null,
    userAgent?: string | null,
    referrer?: string | null,
  ): Promise<void> {
    try {
      if (!this.campaignMetricRepository) return;
      const deviceType = this.resolveDeviceType(userAgent);
      const ipHash = hashIp(clientIp);

      await this.campaignMetricRepository.create({
        campaignId,
        deviceType,
        referrer: referrer || 'DIRECT',
        ipHash,
      });

      this.logger.log(
        `Métrica de visita registrada para campaña '${campaignId}' (${deviceType}, ${referrer || 'DIRECT'})`,
      );
    } catch (error) {
      this.logger.error(
        `Error al registrar métrica de visita para campaña '${campaignId}':`,
        error,
      );
    }
  }

  /**
   * Resuelve el tipo de dispositivo a partir del User-Agent.
   */
  resolveDeviceType(userAgent?: string | null): string {
    if (!userAgent) return 'UNKNOWN';
    if (/tablet|ipad/i.test(userAgent)) return 'TABLET';
    if (/mobile|android|iphone/i.test(userAgent)) return 'MOBILE';
    return 'DESKTOP';
  }

  /**
   * Obtiene la cantidad total de visitas de una campaña (US-19).
   */
  async getVisitCount(campaignId: string): Promise<number> {
    if (!this.campaignMetricRepository) return 0;
    return this.campaignMetricRepository.countByCampaignId(campaignId);
  }

  /**
   * Consulta las campañas para el panel de la institución / dashboard (US-20).
   * Devuelve las métricas de visitas acumuladas y datos clave de cada campaña.
   */
  async findDashboardCampaigns(options: {
    institutionId?: string;
    status?: string;
  }): Promise<CampaignDashboardItemDto[]> {
    if (options.institutionId) {
      const institutionExists = await this.campaignRepository.institutionExists(
        options.institutionId,
      );
      if (!institutionExists) {
        throw new InstitutionNotFoundException(options.institutionId);
      }
    }

    const normalizedStatus = options.status
      ? (options.status.toUpperCase() as campaign_status | 'ALL')
      : 'ACTIVE';

    return this.campaignRepository.findDashboardCampaigns({
      institutionId: options.institutionId,
      status: normalizedStatus,
    });
  }

  /**
   * Obtiene una campaña desde la perspectiva administrativa de la institución.
   * Valida que la campaña pertenezca a la institución indicada y retorna la entidad completa (con totalVisits).
   */
  async adminFindOne(
    institutionId: string,
    campaignId: string,
  ): Promise<CampaignEntity> {
    const institutionExists =
      await this.campaignRepository.institutionExists(institutionId);
    if (!institutionExists) {
      throw new InstitutionNotFoundException(institutionId);
    }

    const campaign = await this.findById(campaignId);
    if (campaign.institutionId !== institutionId) {
      throw new ForbiddenException(
        'La campaña no pertenece a la institución especificada.',
      );
    }

    return campaign;
  }

  /**
   * Actualiza los datos de una campaña desde el panel de la institución (US-16, US-20).
   * Permite cerrar la campaña (status: COMPLETED), sumar o ajustar donantes (currentDonors),
   * modificar metas, plazos u observaciones sin requerir el editToken del difusor.
   */
  async adminUpdate(
    institutionId: string,
    campaignId: string,
    dto: AdminUpdateCampaignDto,
  ): Promise<CampaignEntity> {
    this.logger.log(
      `Iniciando actualización administrativa de campaña '${campaignId}' por institución '${institutionId}'`,
    );

    // 1. Validar existencia y pertenencia a la institución
    const campaign = await this.adminFindOne(institutionId, campaignId);

    // 2. Calcular nueva cantidad de donantes si se envía incremento o fijación directa
    let newCurrentDonors: number | undefined;
    if (dto.incrementDonors !== undefined) {
      newCurrentDonors = (campaign.currentDonors ?? 0) + dto.incrementDonors;
    } else if (dto.currentDonors !== undefined) {
      newCurrentDonors = dto.currentDonors;
    }

    // 3. Manejo de cambio de nombre de paciente (regeneración de slug si aplica)
    let newSlug: string | undefined;
    if (dto.patientName && dto.patientName !== campaign.patientName) {
      let slugCandidate = generateCampaignSlug(dto.patientName);
      let attempts = 0;
      const MAX_SLUG_ATTEMPTS = 5;

      while (attempts < MAX_SLUG_ATTEMPTS) {
        const existingWithSlug =
          await this.campaignRepository.findBySlug(slugCandidate);
        if (!existingWithSlug || existingWithSlug.id === campaignId) {
          newSlug = slugCandidate;
          break;
        }
        attempts++;
        slugCandidate = generateCampaignSlug(dto.patientName);
      }

      if (!newSlug) {
        throw new BadRequestException(
          'No se pudo generar un slug único para el nuevo nombre del paciente. Por favor intente nuevamente.',
        );
      }
    }

    // 4. Parsear deadline si fue provisto
    let deadlineDate: Date | null | undefined = undefined;
    if (dto.deadline !== undefined) {
      if (dto.deadline === null) {
        deadlineDate = null;
      } else {
        const parsed = new Date(dto.deadline);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException(
            'El formato de la fecha límite no es válido (use ISO 8601 o YYYY-MM-DD).',
          );
        }
        deadlineDate = parsed;
      }
    }

    // 5. Determinar estado de la campaña (Cierre automático si alcanza la meta o explícito)
    const effectiveTarget =
      dto.targetDonors !== undefined
        ? dto.targetDonors
        : campaign.targetDonors;

    let resolvedStatus = dto.status;
    if (
      resolvedStatus === undefined &&
      campaign.status === 'ACTIVE' &&
      effectiveTarget !== null &&
      effectiveTarget !== undefined &&
      effectiveTarget > 0 &&
      newCurrentDonors !== undefined &&
      newCurrentDonors >= effectiveTarget
    ) {
      resolvedStatus = 'COMPLETED';
      this.logger.log(
        `Meta alcanzada para campaña '${campaignId}' (${newCurrentDonors}/${effectiveTarget}). Estado actualizado automáticamente a 'COMPLETED'.`,
      );
    }

    // 6. Persistir cambios en el repositorio
    const updated = await this.campaignRepository.update(campaignId, {
      patientName: dto.patientName,
      slug: newSlug,
      bloodType: dto.bloodType,
      donationType: dto.donationType,
      targetDonors: dto.targetDonors,
      currentDonors: newCurrentDonors,
      deadline: deadlineDate,
      observations: dto.observations,
      status: resolvedStatus,
    });

    // 7. Asignar totalVisits calculado para la respuesta completa
    const totalVisits = await this.getVisitCount(campaignId);
    updated.totalVisits = totalVisits;

    this.logger.log(
      `Campaña '${campaignId}' actualizada administrativamente por institución exitosamente.`,
    );
    return updated;
  }

  /**
   * Actualiza los datos de un pedido de donación tras correcciones en el formulario (US-09).
   *
   * Controla:
   * 1. Existencia del pedido y validación estricta de editToken (403 Forbidden si no coincide).
   * 2. Que la campaña no esté cancelada (400 Bad Request si está CANCELLED).
   * 3. Que la institución exista y esté activa si fue modificada.
   * 4. Si el nombre del paciente cambió, regenera el slug para mantener consistencia con URLs y QR.
   * 5. Actualiza los campos especificados y devuelve la entidad completa actualizada.
   */
  async update(id: string, dto: UpdateCampaignDto): Promise<CampaignEntity> {
    this.logger.log(`Iniciando actualización de pedido con ID '${id}' (US-09)`);

    // 1. Obtener campaña existente y validar existencia
    const campaign = await this.findById(id);

    // 2. Validar que el editToken coincida
    if (campaign.editToken !== dto.editToken) {
      this.logger.warn(
        `Intento no autorizado de editar campaña '${id}'. Token incorrecto.`,
      );
      throw new ForbiddenException(
        'El token de edición proporcionado no es válido para esta campaña.',
      );
    }

    // 3. Validar estado de la campaña
    if (campaign.status === 'CANCELLED') {
      throw new BadRequestException(
        'No se puede modificar un pedido de donación que ha sido cancelado.',
      );
    }

    // 4. Validar institución si fue provista y difiere de la actual
    if (dto.institutionId && dto.institutionId !== campaign.institutionId) {
      const institutionExists = await this.campaignRepository.institutionExists(
        dto.institutionId,
      );
      if (!institutionExists) {
        this.logger.warn(
          `Institución con ID '${dto.institutionId}' no existe o está inactiva.`,
        );
        throw new InstitutionNotFoundException(dto.institutionId);
      }
    }

    // 5. Si cambió el nombre del paciente, regenerar el slug único
    let newSlug: string | undefined = undefined;
    if (dto.patientName && dto.patientName !== campaign.patientName) {
      newSlug = await this.generateUniqueSlug(dto.patientName);
      this.logger.log(
        `Nombre de paciente modificado. Nuevo slug generado: '${newSlug}'`,
      );
    }

    // 6. Normalizar deadline si fue provisto
    let deadlineDate: Date | null | undefined = undefined;
    if (dto.deadline !== undefined) {
      if (dto.deadline === null) {
        deadlineDate = null;
      } else {
        const parsed = new Date(dto.deadline);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException(
            'Formato de fecha inválido para la fecha límite (deadline).',
          );
        }
        deadlineDate = parsed;
      }
    }

    // 7. Determinar estado de la campaña (Cierre automático si alcanza la meta o explícito)
    const effectiveTarget =
      dto.targetDonors !== undefined
        ? dto.targetDonors
        : campaign.targetDonors;

    let resolvedStatus = dto.status;
    if (
      resolvedStatus === undefined &&
      campaign.status === 'ACTIVE' &&
      effectiveTarget !== null &&
      effectiveTarget !== undefined &&
      effectiveTarget > 0 &&
      dto.currentDonors !== undefined &&
      dto.currentDonors >= effectiveTarget
    ) {
      resolvedStatus = 'COMPLETED';
      this.logger.log(
        `Meta alcanzada para campaña '${id}' (${dto.currentDonors}/${effectiveTarget}). Estado actualizado automáticamente a 'COMPLETED'.`,
      );
    }

    // 8. Persistir cambios en el repositorio
    const updated = await this.campaignRepository.update(id, {
      patientName: dto.patientName,
      slug: newSlug,
      institutionId: dto.institutionId,
      bloodType: dto.bloodType,
      donationType: dto.donationType,
      targetDonors: dto.targetDonors,
      currentDonors: dto.currentDonors,
      deadline: deadlineDate,
      observations: dto.observations,
      generatedCopy: dto.generatedCopy,
      status: resolvedStatus,
    });

    this.logger.log(`Pedido de donación '${id}' actualizado exitosamente.`);
    return updated;
  }

  /**
   * Valida si un editToken es válido para una campaña dada y devuelve la entidad completa.
   * Utilizado para verificar autorizaciones y precargar formularios al reingresar.
   */
  async verifyEditToken(
    id: string,
    editToken: string,
  ): Promise<CampaignEntity> {
    const campaign = await this.findById(id);
    if (campaign.editToken !== editToken) {
      this.logger.warn(
        `Intento de verificación fallido para campaña '${id}'. Token incorrecto.`,
      );
      throw new ForbiddenException(
        'El token de edición proporcionado no es válido para esta campaña.',
      );
    }
    return campaign;
  }

  /**
   * Guarda o actualiza las placas generadas en el frontend, confirma el pedido en la plataforma
   * y registra el evento en download_log (US-03, US-04, US-07).
   *
   * Controla:
   * 1. Existencia del pedido y validación estricta de editToken.
   * 2. Si la imagen ya fue guardada en previsualización y es idéntica (hash SHA-256), evita re-subir.
   * 3. Si difiere o es nueva, la sube a Storage y actualiza/inserta el registro en campaign_asset.
   * 4. Si la campaña estaba en DRAFT, la confirma definitivamente pasando a estado ACTIVE.
   * 5. Registra el evento en download_log para cada placa de la colección (una o todas) con IP anonimizada.
   */
  async uploadAssets(
    campaignId: string,
    dto: UploadCampaignAssetsDto,
    clientIp?: string,
  ): Promise<CampaignAssetEntity[]> {
    this.logger.log(
      `Iniciando procesamiento de ${dto.assets.length} placas para la campaña '${campaignId}'`,
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

    // 3. Procesar cada placa de la colección
    const defaultDimensions: Record<
      asset_format,
      { width: number; height: number }
    > = {
      SQUARE_1_1: { width: 1080, height: 1080 },
      STORY_9_16: { width: 1080, height: 1920 },
    };

    const savedAssets: CampaignAssetEntity[] = [];

    for (const item of dto.assets) {
      const existingAsset =
        await this.campaignAssetRepository.findByCampaignAndFormat(
          campaignId,
          item.format,
        );

      let asset: CampaignAssetEntity;

      if (item.imageBase64) {
        const { buffer, contentType, extension } = parseBase64Image(
          item.imageBase64,
        );

        const width = item.width ?? defaultDimensions[item.format].width;
        const height = item.height ?? defaultDimensions[item.format].height;
        const storagePath = `${campaignId}/${item.format.toLowerCase()}.${extension}`;

        // Controlar si ya existe la imagen y si es exactamente la misma guardada en previsualización
        let isSame = false;
        if (existingAsset) {
          isSame = await this.storageService.isSameFile(storagePath, buffer);
        }

        if (isSame && existingAsset) {
          this.logger.log(
            `Placa '${item.format}' para campaña '${campaignId}' es idéntica a la existente. Reutilizando sin re-subir.`,
          );
          asset = existingAsset;
        } else {
          this.logger.log(
            `Subiendo/actualizando placa '${item.format}' para campaña '${campaignId}' en Storage`,
          );
          const publicUrl = await this.storageService.uploadFile(
            storagePath,
            buffer,
            contentType,
          );

          asset = await this.campaignAssetRepository.save({
            campaignId,
            format: item.format,
            imageUrl: publicUrl,
            width,
            height,
          });
        }
      } else {
        // Si no se envió Base64, debe existir previamente en previsualización
        if (!existingAsset) {
          throw new BadRequestException(
            `No se encontró una placa previa para el formato '${item.format}' y no se proporcionó la imagen.`,
          );
        }
        asset = existingAsset;
      }

      savedAssets.push(asset);

      // 4. Registrar evento de descarga individual en download_log si corresponde (US-07/ST-02, ST-03)
      if (dto.recordDownload !== false && !dto.downloadType) {
        await this.downloadLogRepository.create({
          campaignId,
          downloadType: ASSET_TO_DOWNLOAD_TYPE[item.format],
          ipHash: hashIp(clientIp),
        });
      }
    }

    // Si se especificó un downloadType personalizado (ej. ZIP_BUNDLE), registrar una sola vez
    if (dto.recordDownload !== false && dto.downloadType) {
      await this.downloadLogRepository.create({
        campaignId,
        downloadType: dto.downloadType,
        ipHash: hashIp(clientIp),
      });
      this.logger.log(
        `Evento de descarga registrado en download_log: type='${dto.downloadType}' para campaña '${campaignId}'`,
      );
    }

    // 5. Guardar texto generado (copy) si se envía junto con las placas
    if (dto.generatedCopy !== undefined) {
      await this.campaignRepository.update(campaignId, {
        generatedCopy: dto.generatedCopy,
      });
      this.logger.log(
        `Texto generado (copy) actualizado para la campaña '${campaignId}'`,
      );
    }

    // 6. Guardar definitivamente el pedido en la plataforma (US-07: DRAFT -> ACTIVE)
    if (campaign.status === 'DRAFT') {
      await this.campaignRepository.updateStatus(campaignId, 'ACTIVE');
      this.logger.log(
        `Campaña '${campaignId}' confirmada exitosamente y guardada en estado 'ACTIVE'`,
      );
    }

    this.logger.log(
      `Se procesaron exitosamente ${savedAssets.length} placas para la campaña '${campaignId}'`,
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
