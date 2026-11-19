import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('InstitutionController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/institutions (GET) debe retornar directamente el array de instituciones para combobox', async () => {
    const response = await request(app.getHttpServer())
      .get('/institutions')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const first = response.body[0];
    expect(first.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(typeof first.name).toBe('string');
    expect(typeof first.address).toBe('string');
    expect(typeof first.city).toBe('string');

    // Comprobar que no expone datos pesados innecesarios para el combobox
    expect((first as any).business_hours).toBeUndefined();
    expect((first as any).specific_requirements).toBeUndefined();
    expect((first as any).faq_url).toBeUndefined();
  });
});
