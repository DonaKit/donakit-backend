import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AdminUpdateCampaignDto } from './admin-update-campaign.dto.js';

describe('AdminUpdateCampaignDto', () => {
  it('debe validar exitosamente cuando se envía incrementDonors = -1', async () => {
    const dto = plainToInstance(AdminUpdateCampaignDto, {
      incrementDonors: -1,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.incrementDonors).toBe(-1);
  });

  it('debe transformar cadenas numéricas como "-1" a número entero', async () => {
    const dto = plainToInstance(AdminUpdateCampaignDto, {
      incrementDonors: '-1',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.incrementDonors).toBe(-1);
  });

  it('debe aceptar el límite inferior de -100', async () => {
    const dto = plainToInstance(AdminUpdateCampaignDto, {
      incrementDonors: -100,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar un ajuste menor a -100', async () => {
    const dto = plainToInstance(AdminUpdateCampaignDto, {
      incrementDonors: -101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.min).toBe(
      'El ajuste de donantes no puede ser menor a -100 en una sola operación.',
    );
  });

  it('debe aceptar incrementos positivos hasta 100', async () => {
    const dto = plainToInstance(AdminUpdateCampaignDto, {
      incrementDonors: 100,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar incrementos mayores a 100', async () => {
    const dto = plainToInstance(AdminUpdateCampaignDto, {
      incrementDonors: 101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.max).toBe(
      'El incremento de donantes no puede exceder 100 en una sola operación.',
    );
  });
});
