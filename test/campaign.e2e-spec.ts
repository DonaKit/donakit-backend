import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseExceptionFilter } from '../src/common/filters/database-exception.filter.js';
import { validationExceptionFactory } from '../src/common/filters/validation-exception.factory.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';

describe('CampaignController (e2e) - US-01 / ST-03, ST-04, ST-05', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testInstitutionId: string;
  const createdCampaignIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue({
        uploadFile: vi.fn().mockImplementation((path: string) => {
          return Promise.resolve(
            `https://mock-storage.supabase.co/campaign-assets/${path}`,
          );
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Aplicar las mismas tuberías y filtros que en producción / main.ts
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

    // Obtener un centro de salud real existente en la base de datos (Supabase)
    const institution = await prisma.institution.findFirst({
      where: { is_active: true },
    });
    if (!institution) {
      throw new Error(
        'Se requiere al menos una institución activa en la base de datos para pruebas E2E.',
      );
    }
    testInstitutionId = institution.id;
  });

  afterAll(async () => {
    // Limpieza de registros creados durante las pruebas
    if (createdCampaignIds.length > 0) {
      await prisma.campaign.deleteMany({
        where: { id: { in: createdCampaignIds } },
      });
    }
    await app.close();
  });

  describe('Criterios de Aceptación (CA) - Validación de campos obligatorios', () => {
    it('debe rechazar la solicitud con 400 y resaltar todos los campos obligatorios cuando el cuerpo está vacío', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.errors).toBeDefined();

      // Verificar mensajes claros para cada dato requerido del CA
      expect(response.body.errors.patientName).toContain(
        'El nombre del paciente es requerido.',
      );
      expect(response.body.errors.institutionId).toContain(
        'El centro de salud es requerido.',
      );
      expect(response.body.errors.bloodType).toContain(
        'El grupo sanguíneo es requerido.',
      );
    });

    it('debe rechazar cuando los campos obligatorios contienen sólo espacios en blanco', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send({
          patientName: '   ',
          institutionId: '   ',
          bloodType: '   ',
        })
        .expect(400);

      expect(response.body.errors.patientName).toContain(
        'El nombre del paciente es requerido.',
      );
      expect(response.body.errors.institutionId).toContain(
        'El centro de salud es requerido.',
      );
      expect(response.body.errors.bloodType).toContain(
        'El grupo sanguíneo es requerido.',
      );
    });
  });

  describe('Validación de formatos y tipos de datos', () => {
    it('debe rechazar un grupo sanguíneo inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send({
          patientName: 'Mateo Rossi',
          institutionId: testInstitutionId,
          bloodType: 'INVALID_TYPE',
        })
        .expect(400);

      expect(response.body.errors.bloodType[0]).toContain(
        'El grupo sanguíneo debe ser uno de los formatos válidos',
      );
    });

    it('debe rechazar un centro de salud con formato de UUID inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send({
          patientName: 'Mateo Rossi',
          institutionId: '123-no-es-uuid',
          bloodType: '0+',
        })
        .expect(400);

      expect(response.body.errors.institutionId[0]).toContain(
        'El centro de salud debe ser un UUID v4 válido.',
      );
    });

    it('debe rechazar un nombre de paciente que contenga números', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send({
          patientName: 'Juan Pérez 123',
          institutionId: testInstitutionId,
          bloodType: '0+',
        })
        .expect(400);

      expect(response.body.errors.patientName[0]).toContain(
        'no se permiten números',
      );
    });

    it('debe responder 404 si el UUID del centro de salud no existe en la base de datos', async () => {
      const nonExistentUuid = '00000000-0000-4000-8000-000000000000';
      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send({
          patientName: 'Mateo Rossi',
          institutionId: nonExistentUuid,
          bloodType: '0+',
        })
        .expect(404);

      expect(response.body.message).toContain(
        'no fue encontrado o no está activo',
      );
    });
  });

  describe('Persistencia y Flujo Exitoso (ST-03, ST-04, ST-05)', () => {
    let createdCampaign: any;

    it('debe persistir el pedido en Supabase con UUID, slug y edit_token generado (POST /campaigns)', async () => {
      const payload = {
        patientName: 'Sofía Agustina Martínez',
        institutionId: testInstitutionId,
        bloodType: 'A+',
        donationType: 'Plaquetas',
        targetDonors: 15,
        observations: 'Paciente internada en sala 4.',
      };

      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Pedido de donación creado exitosamente.',
      );

      const data = response.body.data;
      expect(data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(data.slug).toMatch(
        /^donantes-sofia-agustina-martinez-[a-f0-9]{6}$/,
      );
      expect(data.editToken).toBeDefined();
      expect(data.patientName).toBe('Sofía Agustina Martínez');
      expect(data.bloodType).toBe('A+');
      expect(data.donationType).toBe('Plaquetas');
      expect(data.targetDonors).toBe(15);
      expect(data.institution).toBeDefined();
      expect(data.institution.id).toBe(testInstitutionId);
      expect(data.status).toBe('DRAFT');

      createdCampaign = data;
      createdCampaignIds.push(data.id);
    });

    it('debe soportar nombres de campo snake_case enviados desde el frontend', async () => {
      const payload = {
        patient_name: 'Lucas Benítez',
        institution_id: testInstitutionId,
        blood_type: '0-',
        donation_type: 'Sangre entera',
        target_donors: 8,
      };

      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientName).toBe('Lucas Benítez');
      expect(response.body.data.bloodType).toBe('0-');
      expect(response.body.data.slug).toMatch(
        /^donantes-lucas-benitez-[a-f0-9]{6}$/,
      );

      createdCampaignIds.push(response.body.data.id);
    });

    it('debe permitir crear un pedido con bloodType "Todos" (reposición / cualquier grupo)', async () => {
      const payload = {
        patientName: 'Camila Valdez',
        institutionId: testInstitutionId,
        bloodType: 'Todos',
        donationType: 'Sangre entera',
      };

      const response = await request(app.getHttpServer())
        .post('/campaigns')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientName).toBe('Camila Valdez');
      expect(response.body.data.bloodType).toBe('TODOS');

      createdCampaignIds.push(response.body.data.id);
    });

    it('debe consultar el pedido por su UUID (GET /campaigns/:id) y devolver DTO público sin editToken ni slug', async () => {
      const response = await request(app.getHttpServer())
        .get(`/campaigns/${createdCampaign.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCampaign.id);
      expect(response.body.data.patientName).toBe('Sofía Agustina Martínez');
      expect(response.body.data.editToken).toBeUndefined();
      expect(response.body.data.slug).toBeUndefined();
    });

    it('debe consultar el pedido por su slug amigable (GET /campaigns/:slug) y devolver DTO público sin editToken ni slug', async () => {
      const response = await request(app.getHttpServer())
        .get(`/campaigns/${createdCampaign.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCampaign.id);
      expect(response.body.data.patientName).toBe('Sofía Agustina Martínez');
      expect(response.body.data.institution.name).toBeDefined();
      expect(response.body.data.editToken).toBeUndefined();
      expect(response.body.data.slug).toBeUndefined();
    });

    it('debe registrar y subir las placas generadas en el frontend (POST /campaigns/:id/assets)', async () => {
      const samplePng =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const payload = {
        editToken: createdCampaign.editToken,
        assets: [
          {
            format: 'SQUARE_1_1',
            imageBase64: samplePng,
            width: 1080,
            height: 1080,
          },
          {
            format: 'STORY_9_16',
            imageBase64: samplePng,
            width: 1080,
            height: 1920,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/campaigns/${createdCampaign.id}/assets`)
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registradas y almacenadas exitosamente');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].imageUrl).toContain('square_1_1.png');
      expect(response.body.data[1].imageUrl).toContain('story_9_16.png');

      // Validar que la campaña pasó definitivamente de DRAFT a ACTIVE (US-07)
      const campaignInDb = await prisma.campaign.findUnique({
        where: { id: createdCampaign.id },
      });
      expect(campaignInDb?.status).toBe('ACTIVE');

      // Validar que se registraron los eventos en download_log (US-07)
      const logs = await prisma.download_log.findMany({
        where: { campaign_id: createdCampaign.id },
      });
      expect(logs.length).toBeGreaterThanOrEqual(2);
      const downloadTypes = logs.map((l) => l.download_type);
      expect(downloadTypes).toContain('IMAGE_1_1');
      expect(downloadTypes).toContain('IMAGE_9_16');
      expect(logs[0].ip_hash).toBeDefined();

      // Validar que ahora la consulta pública incluya los assets
      const getResponse = await request(app.getHttpServer())
        .get(`/campaigns/${createdCampaign.id}`)
        .expect(200);

      expect(getResponse.body.data.assets).toBeDefined();
      expect(getResponse.body.data.assets).toHaveLength(2);
      expect(getResponse.body.data.status).toBe('ACTIVE');
    });

    it('debe confirmar y registrar descarga de una placa existente sin reenviar base64 (US-07)', async () => {
      const payload = {
        editToken: createdCampaign.editToken,
        assets: [
          {
            format: 'SQUARE_1_1',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/campaigns/${createdCampaign.id}/assets`)
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].format).toBe('SQUARE_1_1');

      // Verificar que se haya registrado un log adicional de descarga
      const logs = await prisma.download_log.findMany({
        where: { campaign_id: createdCampaign.id, download_type: 'IMAGE_1_1' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('debe rechazar con 400 Bad Request si se solicita confirmar una placa sin base64 y no existe previamente', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/campaigns')
        .send({
          patientName: 'Prueba Sin Placas',
          institutionId: testInstitutionId,
          bloodType: 'B+',
        })
        .expect(201);

      const newCampaignId = createRes.body.data.id;
      const newEditToken = createRes.body.data.editToken;
      createdCampaignIds.push(newCampaignId);

      const response = await request(app.getHttpServer())
        .post(`/campaigns/${newCampaignId}/assets`)
        .send({
          editToken: newEditToken,
          assets: [
            {
              format: 'SQUARE_1_1',
            },
          ],
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain(
        "No se encontró una placa previa para el formato 'SQUARE_1_1'",
      );
    });

    it('debe rechazar la subida de placas si el editToken es incorrecto (403 Forbidden)', async () => {
      const samplePng =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await request(app.getHttpServer())
        .post(`/campaigns/${createdCampaign.id}/assets`)
        .send({
          editToken: 'token-incorrecto-123',
          assets: [
            {
              format: 'SQUARE_1_1',
              imageBase64: samplePng,
            },
          ],
        })
        .expect(403);
    });

    it('debe rechazar con 400 Bad Request si el cuerpo de la petición va completamente vacío', async () => {
      const response = await request(app.getHttpServer())
        .post(`/campaigns/${createdCampaign.id}/assets`)
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.errors.editToken).toBeDefined();
      expect(response.body.errors.assets).toBeDefined();
    });

    it('debe rechazar con 400 Bad Request si la lista de assets está vacía', async () => {
      const response = await request(app.getHttpServer())
        .post(`/campaigns/${createdCampaign.id}/assets`)
        .send({
          editToken: createdCampaign.editToken,
          assets: [],
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.errors.assets[0]).toContain(
        'Debe enviarse al menos una placa',
      );
    });

    it('debe rechazar con 400 Bad Request si una placa no tiene imagen base64', async () => {
      const response = await request(app.getHttpServer())
        .post(`/campaigns/${createdCampaign.id}/assets`)
        .send({
          editToken: createdCampaign.editToken,
          assets: [
            {
              format: 'SQUARE_1_1',
              imageBase64: '',
            },
          ],
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.errors['assets.0.imageBase64']).toBeDefined();
    });
  });
});
