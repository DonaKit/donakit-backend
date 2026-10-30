import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { CampaignEntity } from '../entities/campaign.entity.js';
import { CampaignRepository } from './campaign.repository.js';

describe('CampaignRepository', () => {
  let repository: CampaignRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      campaign: {
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      institution: {
        count: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    repository = new CampaignRepository(mockPrisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('debe persistir en prisma y retornar un CampaignEntity', async () => {
      const mockRecord = {
        id: '11111111-2222-3333-4444-555555555555',
        slug: 'donantes-test-123456',
        edit_token: 'token-abc',
        institution_id: '63a65bfe-3c92-484e-b658-d3446355e5c2',
        patient_name: 'Paciente Test',
        blood_type: 'A+',
        donation_type: 'Sangre entera',
        target_donors: 5,
        current_donors: 0,
        deadline: null,
        observations: null,
        generated_copy: null,
        status: 'DRAFT',
        created_at: new Date(),
        updated_at: new Date(),
        institution: {
          id: '63a65bfe-3c92-484e-b658-d3446355e5c2',
          name: 'Hospital Garrahan',
          address: 'Combate de los Pozos 1881',
          city: 'CABA',
        },
      };

      mockPrisma.campaign.create.mockResolvedValue(mockRecord);

      const result = await repository.create({
        slug: 'donantes-test-123456',
        editToken: 'token-abc',
        institutionId: '63a65bfe-3c92-484e-b658-d3446355e5c2',
        patientName: 'Paciente Test',
        bloodType: 'A+',
      });

      expect(mockPrisma.campaign.create).toHaveBeenCalledOnce();
      expect(result).toBeInstanceOf(CampaignEntity);
      expect(result.id).toBe(mockRecord.id);
      expect(result.patientName).toBe('Paciente Test');
      expect(result.institution?.name).toBe('Hospital Garrahan');
    });
  });

  describe('findById', () => {
    it('debe retornar la entidad si existe en la base de datos', async () => {
      const mockRecord = {
        id: '11111111-2222-3333-4444-555555555555',
        slug: 'donantes-test-123456',
        edit_token: 'token-abc',
        institution_id: 'inst-id',
        patient_name: 'Paciente Test',
        blood_type: 'A+',
        donation_type: 'Sangre entera',
        target_donors: null,
        current_donors: 0,
        deadline: null,
        observations: null,
        generated_copy: null,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockRecord);

      const result = await repository.findById(
        '11111111-2222-3333-4444-555555555555',
      );
      expect(result).toBeInstanceOf(CampaignEntity);
      expect(result?.id).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('debe retornar null si no existe el registro', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('debe retornar la entidad si el slug existe', async () => {
      const mockRecord = {
        id: '11111111-2222-3333-4444-555555555555',
        slug: 'donantes-test-123456',
        edit_token: 'token-abc',
        institution_id: 'inst-id',
        patient_name: 'Paciente Test',
        blood_type: 'A+',
        donation_type: 'Sangre entera',
        target_donors: null,
        current_donors: 0,
        deadline: null,
        observations: null,
        generated_copy: null,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockRecord);

      const result = await repository.findBySlug('donantes-test-123456');
      expect(result).toBeInstanceOf(CampaignEntity);
      expect(result?.slug).toBe('donantes-test-123456');
    });

    it('debe retornar null si el slug no existe', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      const result = await repository.findBySlug('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('institutionExists', () => {
    it('debe retornar true si existe una institución activa', async () => {
      mockPrisma.institution.count.mockResolvedValue(1);

      const exists = await repository.institutionExists('inst-id');
      expect(exists).toBe(true);
      expect(mockPrisma.institution.count).toHaveBeenCalledWith({
        where: { id: 'inst-id', is_active: true },
      });
    });

    it('debe retornar false si no existe la institución', async () => {
      mockPrisma.institution.count.mockResolvedValue(0);

      const exists = await repository.institutionExists('inst-id');
      expect(exists).toBe(false);
    });
  });
});
