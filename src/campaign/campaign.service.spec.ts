import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignService } from './campaign.service.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UploadCampaignAssetsDto } from './dto/upload-campaign-assets.dto.js';
import { CampaignAssetEntity } from './entities/campaign-asset.entity.js';
import { CampaignEntity } from './entities/campaign.entity.js';
import type { CampaignAssetRepository } from './repositories/campaign-asset.repository.js';
import type { CampaignRepository } from './repositories/campaign.repository.js';
import type { StorageService } from '../storage/storage.service.js';
import { InstitutionNotFoundException } from '../common/exceptions/institution-not-found.exception.js';

describe('CampaignService', () => {
  let service: CampaignService;
  let repository: CampaignRepository;
  let assetRepository: CampaignAssetRepository;
  let storageService: StorageService;

  const mockInstitutionId = '63a65bfe-3c92-484e-b658-d3446355e5c2';

  const mockRepository = {
    institutionExists: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
  };

  const mockAssetRepository = {
    save: vi.fn(),
    findByCampaignId: vi.fn(),
  };

  const mockStorageService = {
    uploadFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = mockRepository as unknown as CampaignRepository;
    assetRepository = mockAssetRepository as unknown as CampaignAssetRepository;
    storageService = mockStorageService as unknown as StorageService;
    service = new CampaignService(repository, assetRepository, storageService);
  });

  describe('create', () => {
    const validDto: CreateCampaignDto = {
      patientName: 'Esteban Quispe',
      institutionId: mockInstitutionId,
      bloodType: '0+',
      donationType: 'Sangre entera',
      targetDonors: 10,
      deadline: '2026-12-31',
      observations: 'Presentarse en ayunas de grasas.',
    };

    it('debe crear un pedido de donación exitosamente cuando los datos son válidos', async () => {
      mockRepository.institutionExists.mockResolvedValue(true);
      mockRepository.findBySlug.mockResolvedValue(null); // No hay colisión
      mockRepository.create.mockImplementation((data) =>
        Promise.resolve(
          new CampaignEntity({
            id: data.id,
            slug: data.slug,
            editToken: data.editToken,
            institutionId: data.institutionId,
            patientName: data.patientName,
            bloodType: data.bloodType,
            donationType: data.donationType,
            targetDonors: data.targetDonors,
            deadline: data.deadline,
            observations: data.observations,
            status: data.status,
          }),
        ),
      );

      const result = await service.create(validDto);

      expect(mockRepository.institutionExists).toHaveBeenCalledWith(
        mockInstitutionId,
      );
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result.patientName).toBe(validDto.patientName);
      expect(result.bloodType).toBe(validDto.bloodType);
      expect(result.id).toBeDefined();
      expect(result.slug).toMatch(/^donantes-esteban-quispe-[a-f0-9]{6}$/);
      expect(result.editToken).toBeDefined();
    });

    it('debe lanzar InstitutionNotFoundException si el centro de salud no existe o está inactivo', async () => {
      mockRepository.institutionExists.mockResolvedValue(false);

      await expect(service.create(validDto)).rejects.toThrow(
        InstitutionNotFoundException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('debe reintentar la generación de slug si ocurre una colisión', async () => {
      mockRepository.institutionExists.mockResolvedValue(true);
      // Simula colisión en el primer intento y éxito en el segundo
      mockRepository.findBySlug
        .mockResolvedValueOnce(new CampaignEntity({ slug: 'collision' }))
        .mockResolvedValueOnce(null);

      mockRepository.create.mockImplementation((data) =>
        Promise.resolve(new CampaignEntity({ ...data })),
      );

      const result = await service.create(validDto);

      expect(mockRepository.findBySlug).toHaveBeenCalledTimes(2);
      expect(result.slug).toBeDefined();
    });
  });

  describe('findById', () => {
    it('debe retornar la campaña si existe', async () => {
      const mockCampaign = new CampaignEntity({
        id: 'c8a48c74-5fe6-4fbb-a862-f35601bed580',
        patientName: 'Test Patient',
      });
      mockRepository.findById.mockResolvedValue(mockCampaign);

      const result = await service.findById(
        'c8a48c74-5fe6-4fbb-a862-f35601bed580',
      );
      expect(result).toBe(mockCampaign);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('debe retornar la campaña si el slug existe', async () => {
      const mockCampaign = new CampaignEntity({
        slug: 'donantes-test-123456',
        patientName: 'Test Patient',
      });
      mockRepository.findBySlug.mockResolvedValue(mockCampaign);

      const result = await service.findBySlug('donantes-test-123456');
      expect(result).toBe(mockCampaign);
    });

    it('debe lanzar NotFoundException si el slug no existe', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('uploadAssets', () => {
    const campaignId = 'c8a48c74-5fe6-4fbb-a862-f35601bed580';
    const validEditToken = 'secret-token-123';
    const samplePngBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const validUploadDto: UploadCampaignAssetsDto = {
      editToken: validEditToken,
      assets: [
        {
          format: 'SQUARE_1_1',
          imageBase64: samplePngBase64,
          width: 1080,
          height: 1080,
        },
      ],
    };

    it('debe subir los assets a Storage y guardarlos en BD si la campaña y token coinciden', async () => {
      const mockCampaign = new CampaignEntity({
        id: campaignId,
        editToken: validEditToken,
        patientName: 'Juan Carlos',
      });

      mockRepository.findById.mockResolvedValue(mockCampaign);
      mockStorageService.uploadFile.mockResolvedValue(
        'https://storage.supabase.co/campaign-assets/c8a48c74/square_1_1.png',
      );
      mockAssetRepository.save.mockResolvedValue(
        new CampaignAssetEntity({
          id: 'asset-uuid-1',
          campaignId,
          format: 'SQUARE_1_1',
          imageUrl:
            'https://storage.supabase.co/campaign-assets/c8a48c74/square_1_1.png',
          width: 1080,
          height: 1080,
          createdAt: new Date(),
        }),
      );

      const results = await service.uploadAssets(campaignId, validUploadDto);

      expect(mockRepository.findById).toHaveBeenCalledWith(campaignId);
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        `${campaignId}/square_1_1.png`,
        expect.any(Buffer),
        'image/png',
      );
      expect(mockAssetRepository.save).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].imageUrl).toContain('square_1_1.png');
    });

    it('debe lanzar NotFoundException si la campaña no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.uploadAssets('non-existent-campaign', validUploadDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si el editToken no coincide', async () => {
      const mockCampaign = new CampaignEntity({
        id: campaignId,
        editToken: 'other-token',
      });
      mockRepository.findById.mockResolvedValue(mockCampaign);

      await expect(
        service.uploadAssets(campaignId, {
          editToken: 'wrong-token',
          assets: validUploadDto.assets,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
