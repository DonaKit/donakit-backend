import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { buildCorsOptions } from './../src/config/cors.config.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const configuredOrigin =
    process.env.FRONTEND_URL?.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ||
    'https://frontend-e2e.example.com';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(buildCorsOptions(configuredOrigin));
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('DonaKit API Online');
  });

  it('/health (GET) debe responder 200 con { status: "ok" } sin exponer metadatos internos', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('debe permitir peticiones CORS desde el origen configurado en FRONTEND_URL', async () => {
    const normalized = new URL(configuredOrigin).origin;
    await request(app.getHttpServer())
      .get('/health')
      .set('Origin', normalized)
      .expect(200)
      .expect('access-control-allow-origin', normalized);
  });

  it('debe rechazar peticiones CORS desde orígenes no configurados', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://origen-no-autorizado.invalid');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.status).toBe(500);
  });

  afterEach(async () => {
    await app.close();
  });
});
