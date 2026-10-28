import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { CampaignEntity } from './entities/campaign.entity.js';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: CampaignService;

  const mockService = {
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
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
