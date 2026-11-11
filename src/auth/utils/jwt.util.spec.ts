import { afterEach, describe, expect, it } from 'vitest';
import {
  getAdminEmailWhitelist,
  getAdminJwtSecret,
  signAdminJwt,
  verifyAdminJwt,
} from './jwt.util.js';

describe('jwt.util', () => {
  const originalEnv = { ...process.env };
  const secret = 'super-secret-test-key-1234567890';

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('debe firmar y verificar correctamente un JWT administrativo HS256', () => {
    const token = signAdminJwt(
      {
        email: 'Admin@Hospital.org ',
        name: 'Coordinador Hemoterapia',
        ttlSeconds: 120,
      },
      secret,
    );

    const payload = verifyAdminJwt(token, secret);
    expect(payload.email).toBe('admin@hospital.org');
    expect(payload.sub).toBe('admin@hospital.org');
    expect(payload.name).toBe('Coordinador Hemoterapia');
    expect(payload.role).toBe('ADMIN');
    expect(payload.iss).toBe('donakit-frontend');
    expect(payload.aud).toBe('donakit-backend');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('debe rechazar un token firmado con otro secreto', () => {
    const token = signAdminJwt({ email: 'admin@hospital.org' }, secret);

    expect(() => verifyAdminJwt(token, 'wrong-secret')).toThrow(
      'La firma del token JWT es inválida.',
    );
  });

  it('debe rechazar un token expirado', () => {
    const token = signAdminJwt(
      { email: 'admin@hospital.org', ttlSeconds: -10 },
      secret,
    );

    expect(() => verifyAdminJwt(token, secret)).toThrow(
      'El token JWT ha expirado.',
    );
  });

  it('debe rechazar un token manipulado o con formato inválido', () => {
    const token = signAdminJwt({ email: 'admin@hospital.org' }, secret);
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        email: 'hacker@evil.com',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 600,
      }),
    ).toString('base64url');

    expect(() =>
      verifyAdminJwt(`${parts[0]}.${tamperedPayload}.${parts[2]}`, secret),
    ).toThrow('La firma del token JWT es inválida.');
    expect(() => verifyAdminJwt('invalid.token', secret)).toThrow(
      'El formato del token JWT es inválido.',
    );
  });

  it('getAdminJwtSecret debe priorizar JWT_SECRET y usar AUTH_SECRET como respaldo', () => {
    process.env.JWT_SECRET = 'jwt-secret-value';
    process.env.AUTH_SECRET = 'auth-secret-value';
    expect(getAdminJwtSecret()).toBe('jwt-secret-value');

    delete process.env.JWT_SECRET;
    expect(getAdminJwtSecret()).toBe('auth-secret-value');
  });

  it('getAdminEmailWhitelist debe normalizar la lista ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = ' Admin1@Test.org, admin2@test.org , ';
    expect(getAdminEmailWhitelist()).toEqual([
      'admin1@test.org',
      'admin2@test.org',
    ]);
  });
});

