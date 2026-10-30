import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UploadCampaignAssetsDto } from './dto/upload-campaign-assets.dto.js';
import { CampaignAssetEntity } from './entities/campaign-asset.entity.js';
import { CampaignEntity } from './entities/campaign.entity.js';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: CampaignService;

  const mockService = {
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    uploadAssets: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as CampaignService;
    controller = new CampaignController(service);
  });

  describe('create', () => {
    it('debe llamar a service.create y retornar el pedido encapsulado en CampaignResponseDto', async () => {
      const dto: CreateCampaignDto = {
        patientName: 'Lucía Fernández',
        institutionId: '63a65bfe-3c92-484e-b658-d3446355e5c2',
        bloodType: 'A+',
      };

      const mockCampaign = new CampaignEntity({
        id: '12345678-1234-4234-8234-123456789abc',
        slug: 'donantes-lucia-fernandez-123456',
        patientName: dto.patientName,
        bloodType: dto.bloodType,
      });

      mockService.create.mockResolvedValue(mockCampaign);

      const response = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Pedido de donación creado exitosamente.');
      expect(response.data).toBe(mockCampaign);
    });
  });

  describe('uploadAssets', () => {
    const validUuid = '63a65bfe-3c92-484e-b658-d3446355e5c2';
    const mockReq = { headers: {}, ip: '192.168.1.1' } as any;
    const uploadDto: UploadCampaignAssetsDto = {
      editToken: 'secret-token-123',
      assets: [
        {
          format: 'SQUARE_1_1',
          imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      ],
    };

    it('debe registrar y retornar los assets asociados a la campaña', async () => {
      const mockAssets = [
        new CampaignAssetEntity({
          id: 'asset-1',
          campaignId: validUuid,
          format: 'SQUARE_1_1',
          imageUrl: 'https://example.com/asset.png',
          width: 1080,
          height: 1080,
          createdAt: new Date(),
        }),
      ];

      mockService.uploadAssets.mockResolvedValue(mockAssets);

      const response = await controller.uploadAssets(validUuid, uploadDto, mockReq);

      expect(mockService.uploadAssets).toHaveBeenCalledWith(validUuid, uploadDto, '192.168.1.1');
      expect(response.success).toBe(true);
      expect(response.message).toBe('Placas del pedido registradas y almacenadas exitosamente.');
      expect(response.data).toEqual(mockAssets);
    });

    it('debe lanzar BadRequestException si el parámetro ID no es un UUID v4 válido', async () => {
      await expect(
        controller.uploadAssets('invalid-id', uploadDto, mockReq),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.uploadAssets).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe llamar a service.findById si el parámetro es un UUID v4 y devolver DTO público sin editToken ni slug', async () => {
      const uuid = '63a65bfe-3c92-484e-b658-d3446355e5c2';
      const mockCampaign = new CampaignEntity({
        id: uuid,
        slug: 'donantes-test-123456',
        editToken: 'secret-edit-token-123',
        patientName: 'Test',
      });
      mockService.findById.mockResolvedValue(mockCampaign);

      const response = await controller.findOne(uuid);

      expect(mockService.findById).toHaveBeenCalledWith(uuid);
      expect(mockService.findBySlug).not.toHaveBeenCalled();
      expect(response.data.id).toBe(uuid);
      expect(response.data.patientName).toBe('Test');
      expect((response.data as any).editToken).toBeUndefined();
      expect((response.data as any).slug).toBeUndefined();
    });

    it('debe llamar a service.findBySlug si el parámetro no es un UUID y devolver DTO público sin editToken ni slug', async () => {
      const slug = 'donantes-lucia-fernandez-123456';
      const mockCampaign = new CampaignEntity({
        id: '63a65bfe-3c92-484e-b658-d3446355e5c2',
        slug,
        editToken: 'secret-edit-token-123',
        patientName: 'Test',
      });
      mockService.findBySlug.mockResolvedValue(mockCampaign);

      const response = await controller.findOne(slug);

      expect(mockService.findBySlug).toHaveBeenCalledWith(slug);
      expect(mockService.findById).not.toHaveBeenCalled();
      expect(response.data.id).toBe('63a65bfe-3c92-484e-b658-d3446355e5c2');
      expect(response.data.patientName).toBe('Test');
      expect((response.data as any).editToken).toBeUndefined();
      expect((response.data as any).slug).toBeUndefined();
    });
  });
});
