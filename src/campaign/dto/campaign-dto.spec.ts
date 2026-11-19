import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AdminUpdateCampaignDto } from './admin-update-campaign.dto.js';
import { CreateCampaignDto } from './create-campaign.dto.js';
import { UpdateCampaignDto } from './update-campaign.dto.js';

describe('Campaign DTO Validations', () => {
  describe('CreateCampaignDto (BUG-06)', () => {
    it('debe aceptar nombres de paciente válidos con iniciales, tildes y apóstrofos', async () => {
      const validNames = [
        'Juan C. Pérez',
        'D’Angelo Rossi',
        "O'Connor Gallagher",
        'María Belén Gómez',
        'Jean-Luc Picard',
        'Ana M. S. Rodríguez',
      ];

      for (const name of validNames) {
        const dto = plainToInstance(CreateCampaignDto, {
          patientName: name,
          institutionId: '63a65bfe-3c92-484e-b658-d3446355e5c2',
          bloodType: '0+',
        });

        const errors = await validate(dto);
        const nameErrors = errors.filter((e) => e.property === 'patientName');
        expect(nameErrors, `Fallo para el nombre '${name}'`).toHaveLength(0);
      }
    });

    it('debe rechazar nombres de paciente que contengan números o caracteres no permitidos', async () => {
      const invalidNames = [
        'Juan 123',
        'Pedro_Gómez',
        '<script>',
        '---',
        '..',
        '12345',
      ];

      for (const name of invalidNames) {
        const dto = plainToInstance(CreateCampaignDto, {
          patientName: name,
          institutionId: '63a65bfe-3c92-484e-b658-d3446355e5c2',
          bloodType: '0+',
        });

        const errors = await validate(dto);
        const nameErrors = errors.filter((e) => e.property === 'patientName');
        expect(nameErrors.length, `Debió fallar para '${name}'`).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('AdminUpdateCampaignDto (BUG-02 & BUG-06)', () => {
    it('debe aceptar incrementDonors negativo para decremento atómico (-1)', async () => {
      const dto = plainToInstance(AdminUpdateCampaignDto, {
        incrementDonors: -1,
      });

      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'incrementDonors')).toHaveLength(
        0,
      );
    });

    it('debe aceptar decrementDonors positivo (1)', async () => {
      const dto = plainToInstance(AdminUpdateCampaignDto, {
        decrementDonors: 1,
      });

      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'decrementDonors')).toHaveLength(
        0,
      );
    });

    it('debe rechazar decrementos mayores a 100', async () => {
      const dto = plainToInstance(AdminUpdateCampaignDto, {
        decrementDonors: 101,
      });

      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'decrementDonors')).toHaveLength(
        1,
      );
    });

    it('debe aceptar nombres de paciente con iniciales y apóstrofos en el admin', async () => {
      const dto = plainToInstance(AdminUpdateCampaignDto, {
        patientName: 'Dr. John D’Angelo',
      });

      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'patientName')).toHaveLength(0);
    });
  });

  describe('UpdateCampaignDto (BUG-06)', () => {
    it('debe aceptar nombres con iniciales y tildes en actualización con editToken', async () => {
      const dto = plainToInstance(UpdateCampaignDto, {
        editToken: 'token-valido',
        patientName: 'Martín A. Gómez',
      });

      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'patientName')).toHaveLength(0);
    });
  });
});
