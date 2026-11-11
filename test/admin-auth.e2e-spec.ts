import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { signAdminJwt } from '../src/auth/utils/jwt.util.js';
import { DatabaseExceptionFilter } from '../src/common/filters/database-exception.filter.js';
import { validationExceptionFactory } from '../src/common/filters/validation-exception.factory.js';
import { buildCorsOptions } from '../src/config/cors.config.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('AdminAuthGuard (e2e) - Protección de endpoints administrativos', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let institutionId: string;
  let testCampaignId: string;
  const originalEnv = { ...process.env };
  const testSecret = 'e2e-shared-admin-jwt-secret-key';
  const testOrigin = 'https://frontend-e2e.example.com';

  beforeAll(async () => {
    process.env.JWT_SECRET = testSecret;
    process.env.ADMIN_EMAILS = 'admin-e2e@garrahan.gov.ar';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(buildCorsOptions(testOrigin));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        stopAtFirstError: false,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    app.useGlobalFilters(new DatabaseExceptionFilter());

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    const institution = await prisma.institution.findFirst({
      where: { is_active: true },
    });
    if (!institution) {
      throw new Error(
        'Se requiere al menos una institución activa para pruebas E2E.',
      );
    }
    institutionId = institution.id;

    // Crear campaña temporal para validar acceso admin y limpieza posterior
    const createRes = await request(app.getHttpServer())
      .post('/campaigns')
      .send({
        patientName: 'Paciente Auth Admin',
        institutionId,
        bloodType: '0+',
        targetDonors: 5,
      })
      .expect(201);

    testCampaignId = createRes.body.data.id;
  });

  afterAll(async () => {
    if (testCampaignId) {
      await prisma.campaign.deleteMany({ where: { id: testCampaignId } });
    }
    process.env = { ...originalEnv };
    await app.close();
  });

  it('debe rechazar con 401 todos los endpoints administrativos si no se envía Bearer token', async () => {
    await request(app.getHttpServer()).get('/campaigns').expect(401);
    await request(app.getHttpServer())
      .get(`/institutions/${institutionId}/campaigns`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/institutions/${institutionId}/campaigns/${testCampaignId}`)
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/institutions/${institutionId}/campaigns/${testCampaignId}`)
      .send({ incrementDonors: 1 })
      .expect(401);
  });

  it('debe rechazar con 401 si el token tiene firma inválida o expiró', async () => {
    const expired = signAdminJwt(
      { email: 'admin-e2e@garrahan.gov.ar', ttlSeconds: -5 },
      testSecret,
    );
    const wrongSecret = signAdminJwt(
      { email: 'admin-e2e@garrahan.gov.ar' },
      'otro-secreto',
    );

    await request(app.getHttpServer())
      .get('/campaigns')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/institutions/${institutionId}/campaigns/${testCampaignId}`)
      .set('Authorization', `Bearer ${wrongSecret}`)
      .send({ status: 'COMPLETED' })
      .expect(401);
  });

  it('debe rechazar con 403 si el email autenticado no pertenece a ADMIN_EMAILS', async () => {
    const nonAdminToken = signAdminJwt(
      { email: 'usuario-comun@gmail.com' },
      testSecret,
    );

    await request(app.getHttpServer())
      .get('/campaigns')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/institutions/${institutionId}/campaigns/${testCampaignId}`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ incrementDonors: 1 })
      .expect(403);
  });

  it('debe permitir acceder y actualizar desde los endpoints administrativos con Bearer JWT válido', async () => {
    const adminToken = signAdminJwt(
      { email: 'admin-e2e@garrahan.gov.ar', name: 'Admin E2E' },
      testSecret,
    );

    const listRes = await request(app.getHttpServer())
      .get('/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body.success).toBe(true);

    const instListRes = await request(app.getHttpServer())
      .get(`/institutions/${institutionId}/campaigns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(instListRes.body.success).toBe(true);

    const detailRes = await request(app.getHttpServer())
      .get(`/institutions/${institutionId}/campaigns/${testCampaignId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detailRes.body.data.id).toBe(testCampaignId);

    const patchRes = await request(app.getHttpServer())
      .patch(`/institutions/${institutionId}/campaigns/${testCampaignId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ incrementDonors: 1, status: 'COMPLETED' })
      .expect(200);
    expect(patchRes.body.data.currentDonors).toBe(1);
    expect(patchRes.body.data.status).toBe('COMPLETED');
  });

  it('debe permitir el preflight CORS con cabecera Authorization desde el origen configurado', async () => {
    const res = await request(app.getHttpServer())
      .options('/campaigns')
      .set('Origin', testOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization, content-type')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(testOrigin);
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain(
      'authorization',
    );
  });

  it('debe mantener públicas las rutas de catálogo como GET /institutions sin Authorization', async () => {
    const res = await request(app.getHttpServer())
      .get('/institutions')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});

