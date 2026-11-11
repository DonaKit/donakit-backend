import { createHmac } from 'node:crypto';
import {
  type ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signAdminJwt } from '../utils/jwt.util.js';
import {
  AdminAuthGuard,
  type AdminAuthenticatedRequest,
} from './admin-auth.guard.js';

function createMockContext(authorization?: string): {
  context: ExecutionContext;
  request: Partial<AdminAuthenticatedRequest>;
} {
  const request: Partial<AdminAuthenticatedRequest> = {
    headers: authorization !== undefined ? { authorization } : {},
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('AdminAuthGuard', () => {
  const originalEnv = { ...process.env };
  const secret = 'test-shared-jwt-secret-for-guard';
  let guard: AdminAuthGuard;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: secret };
    delete process.env.ADMIN_EMAILS;
    guard = new AdminAuthGuard();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('debe permitir acceso con Bearer JWT válido y adjuntar adminUser al request', () => {
    const token = signAdminJwt({ email: 'admin@garrahan.gov.ar' }, secret);
    const { context, request } = createMockContext(`Bearer ${token}`);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.adminUser?.email).toBe('admin@garrahan.gov.ar');
    expect(request.adminUser?.role).toBe('ADMIN');
  });

  it('debe lanzar UnauthorizedException si falta la cabecera Authorization', () => {
    const { context } = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si el formato no es Bearer <token>', () => {
    const { context } = createMockContext('Basic abc123');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si la firma es inválida o el token expiró', () => {
    const expired = signAdminJwt(
      { email: 'admin@garrahan.gov.ar', ttlSeconds: -5 },
      secret,
    );
    const { context } = createMockContext(`Bearer ${expired}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debe lanzar InternalServerErrorException si no está configurado JWT_SECRET ni AUTH_SECRET', () => {
    delete process.env.JWT_SECRET;
    delete process.env.AUTH_SECRET;
    const token = signAdminJwt({ email: 'admin@garrahan.gov.ar' }, secret);
    const { context } = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(
      InternalServerErrorException,
    );
  });

  it('debe validar ADMIN_EMAILS si está definida en backend y rechazar correos fuera de la lista con 403', () => {
    process.env.ADMIN_EMAILS = 'autorizado@garrahan.gov.ar';

    const unauthorizedToken = signAdminJwt(
      { email: 'intruso@gmail.com' },
      secret,
    );
    const { context: deniedCtx } = createMockContext(
      `Bearer ${unauthorizedToken}`,
    );
    expect(() => guard.canActivate(deniedCtx)).toThrow(ForbiddenException);

    const authorizedToken = signAdminJwt(
      { email: 'Autorizado@Garrahan.gov.ar' },
      secret,
    );
    const { context: okCtx } = createMockContext(`Bearer ${authorizedToken}`);
    expect(guard.canActivate(okCtx)).toBe(true);
  });

  it('debe rechazar con ForbiddenException si el rol en el JWT no es ADMIN', () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        email: 'user@garrahan.gov.ar',
        role: 'DONOR',
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const { context } = createMockContext(
      `Bearer ${header}.${payload}.${signature}`,
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
