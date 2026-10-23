import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignService } from './campaign.service.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { CampaignEntity } from './entities/campaign.entity.js';
import { CampaignRepository } from './repositories/campaign.repository.js';
import { InstitutionNotFoundException } from '../common/exceptions/institution-not-found.exception.js';

describe('CampaignService', () => {
  let service: CampaignService;
  let repository: CampaignRepository;

  const mockInstitutionId = '63a65bfe-3c92-484e-b658-d3446355e5c2';

  const mockRepository = {
    institutionExists: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = mockRepository as unknown as CampaignRepository;
    service = new CampaignService(repository);
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
            currentDonors: 0,
            deadline: data.deadline,
            observations: data.observations,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      );

      const result = await service.create(validDto);

      expect(mockRepository.institutionExists).toHaveBeenCalledWith(
        mockInstitutionId,
      );
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(result).toBeInstanceOf(CampaignEntity);
      expect(result.patientName).toBe('Esteban Quispe');
      expect(result.bloodType).toBe('0+');
      expect(result.slug).toMatch(/^donantes-esteban-quispe-[a-f0-9]{6}$/);
      expect(result.id).toBeDefined();
      expect(result.editToken).toBeDefined();
    });

    it('debe lanzar InstitutionNotFoundException si el centro de salud no existe', async () => {
      mockRepository.institutionExists.mockResolvedValue(false);

      await expect(service.create(validDto)).rejects.toThrow(
        InstitutionNotFoundException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('debe regenerar el slug en caso de colisión', async () => {
      mockRepository.institutionExists.mockResolvedValue(true);
      // Simular que el primer slug generado ya existe, pero el segundo no
      mockRepository.findBySlug
        .mockResolvedValueOnce(new CampaignEntity({ id: 'existing-id' }))
        .mockResolvedValueOnce(null);

      mockRepository.create.mockImplementation((data) =>
        Promise.resolve(
          new CampaignEntity({
            id: data.id,
            slug: data.slug,
            editToken: data.editToken,
            institutionId: data.institutionId,
            patientName: data.patientName,
            bloodType: data.bloodType,
          }),
        ),
      );

      const result = await service.create(validDto);

      expect(mockRepository.findBySlug).toHaveBeenCalledTimes(2);
      expect(result.slug).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledOnce();
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
});
