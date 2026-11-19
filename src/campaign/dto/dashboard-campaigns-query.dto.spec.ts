import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { DashboardCampaignsQueryDto } from './dashboard-campaigns-query.dto.js';

describe('DashboardCampaignsQueryDto', () => {
  it('debe tener valores por defecto para page=1, limit=30 y status=ACTIVE', () => {
    const dto = plainToInstance(DashboardCampaignsQueryDto, {});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(30);
    expect(dto.status).toBe('ACTIVE');
  });

  it('debe transformar cadenas numéricas en page y limit', async () => {
    const dto = plainToInstance(DashboardCampaignsQueryDto, {
      page: '2',
      limit: '15',
      status: 'completed',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
    expect(dto.status).toBe('COMPLETED');
  });

  it('debe rechazar limit superior a 100', async () => {
    const dto = plainToInstance(DashboardCampaignsQueryDto, {
      limit: 101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe rechazar page inferior a 1', async () => {
    const dto = plainToInstance(DashboardCampaignsQueryDto, {
      page: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe aceptar status ALL', async () => {
    const dto = plainToInstance(DashboardCampaignsQueryDto, {
      status: 'ALL',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.status).toBe('ALL');
  });
});
