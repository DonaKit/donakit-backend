import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignService } from '../campaign/campaign.service.js';
import { InstitutionController } from './institution.controller.js';
import { InstitutionService } from './institution.service.js';

describe('InstitutionController', () => {
  let controller: InstitutionController;
  let service: InstitutionService;
  let campaignService: CampaignService;

  const mockService = {
    findAll: vi.fn(),
  };

  const mockCampaignService = {
    findDashboardCampaigns: vi.fn(),
    adminFindOne: vi.fn(),
    adminUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as InstitutionService;
    campaignService = mockCampaignService as unknown as CampaignService;
    controller = new InstitutionController(service, campaignService);
  });

  describe('findAll', () => {
    it('debe llamar a service.findAll y retornar directamente el listado de instituciones', async () => {
      const mockList = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Hospital Garrahan',
          address: 'Pichincha 1890',
          city: 'Buenos Aires',
        },
      ];

      mockService.findAll.mockResolvedValue(mockList);

      const response = await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockList);
    });
  });

  describe('findCampaigns (US-20)', () => {
    it('debe consultar las campañas de la institución para el dashboard', async () => {
      const mockCampaigns = [
        {
          id: 'camp-1',
          slug: 'donantes-test',
          patientName: 'Juan Pérez',
          totalVisits: 10,
        },
      ];
      mockCampaignService.findDashboardCampaigns.mockResolvedValue(
        mockCampaigns,
      );

      const response = await controller.findCampaigns('inst-1', 'ACTIVE');

      expect(mockCampaignService.findDashboardCampaigns).toHaveBeenCalledWith({
        institutionId: 'inst-1',
        status: 'ACTIVE',
      });
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCampaigns);
      expect(response.total).toBe(1);
    });
  });

  describe('findOneCampaign (US-20)', () => {
    const validInstId = '63a65bfe-3c92-484e-b658-d3446355e5c2';
    const validCampId = 'c8a48c74-5fe6-4fbb-a862-f35601bed580';

    it('debe obtener la campaña completa para el admin institucional', async () => {
      const mockCampaign = {
        id: validCampId,
        institutionId: validInstId,
        patientName: 'Juan Pérez',
        totalVisits: 25,
      };
      mockCampaignService.adminFindOne.mockResolvedValue(mockCampaign);

      const response = await controller.findOneCampaign(
        validInstId,
        validCampId,
      );

      expect(mockCampaignService.adminFindOne).toHaveBeenCalledWith(
        validInstId,
        validCampId,
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCampaign);
    });

    it('debe lanzar BadRequestException si el UUID de institución o campaña es inválido', async () => {
      await expect(
        controller.findOneCampaign('invalid-id', validCampId),
      ).rejects.toThrow(
        'El identificador de la institución debe ser un UUID v4 válido.',
      );

      await expect(
        controller.findOneCampaign(validInstId, 'invalid-id'),
      ).rejects.toThrow(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    });
  });

  describe('updateCampaign (US-16, US-20)', () => {
    const validInstId = '63a65bfe-3c92-484e-b658-d3446355e5c2';
    const validCampId = 'c8a48c74-5fe6-4fbb-a862-f35601bed580';

    it('debe actualizar la campaña y guardar los cambios del admin (cerrar / sumar donantes)', async () => {
      const dto = {
        currentDonors: 8,
        status: 'COMPLETED' as const,
      };
      const mockUpdated = {
        id: validCampId,
        institutionId: validInstId,
        currentDonors: 8,
        status: 'COMPLETED',
      };
      mockCampaignService.adminUpdate.mockResolvedValue(mockUpdated);

      const response = await controller.updateCampaign(
        validInstId,
        validCampId,
        dto,
      );

      expect(mockCampaignService.adminUpdate).toHaveBeenCalledWith(
        validInstId,
        validCampId,
        dto,
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUpdated);
    });

    it('debe lanzar BadRequestException si el UUID de institución o campaña es inválido', async () => {
      await expect(
        controller.updateCampaign('invalid-id', validCampId, {}),
      ).rejects.toThrow(
        'El identificador de la institución debe ser un UUID v4 válido.',
      );

      await expect(
        controller.updateCampaign(validInstId, 'invalid-id', {}),
      ).rejects.toThrow(
        'El identificador de la campaña debe ser un UUID v4 válido.',
      );
    });
  });
});
