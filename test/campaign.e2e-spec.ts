import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseExceptionFilter } from '../src/common/filters/database-exception.filter.js';
import { validationExceptionFactory } from '../src/common/filters/validation-exception.factory.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('CampaignController (e2e) - US-01 / ST-03, ST-04, ST-05', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testInstitutionId: string;
  const createdCampaignIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    it('debe consultar el pedido por su UUID (GET /campaigns/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/campaigns/${createdCampaign.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCampaign.id);
      expect(response.body.data.slug).toBe(createdCampaign.slug);
      expect(response.body.data.patientName).toBe('Sofía Agustina Martínez');
    });

    it('debe consultar el pedido por su slug amigable (GET /campaigns/:slug)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/campaigns/${createdCampaign.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCampaign.id);
      expect(response.body.data.patientName).toBe('Sofía Agustina Martínez');
      expect(response.body.data.institution.name).toBeDefined();
    });
  });
});
