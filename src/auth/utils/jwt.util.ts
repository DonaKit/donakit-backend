import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  name?: string;
  role: string;
  iss?: string;
  aud?: string;
  iat: number;
  exp: number;
}

export interface SignAdminJwtInput {
  email: string;
  name?: string;
  ttlSeconds?: number;
  iss?: string;
  aud?: string;
}

const EXPECTED_ISSUER = 'donakit-frontend';
const EXPECTED_AUDIENCE = 'donakit-backend';

/**
 * Obtiene el secreto compartido para firmar/validar JWTs administrativos.
 * Prioriza `JWT_SECRET` y usa `AUTH_SECRET` como respaldo por compatibilidad con Auth.js.
 */
export function getAdminJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || '';
}

/**
 * Obtiene la lista blanca opcional de correos administradores configurada en el backend.
 * Si no está definida o está vacía, el backend confía en los tokens firmados por el frontend.
 */
export function getAdminEmailWhitelist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function decodeBase64UrlJson<T>(segment: string, label: string): T {
  try {
    const raw = Buffer.from(segment, 'base64url').toString('utf8');
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`El ${label} del token JWT no tiene un formato válido.`);
  }
}

/**
 * Firma un JWT estándar HS256 para sesiones administrativas entre frontend y backend.
 */
export function signAdminJwt(
  input: SignAdminJwtInput,
  secret: string,
): string {
  const normalizedSecret = secret.trim();
  if (!normalizedSecret) {
    throw new Error('El secreto JWT no puede estar vacío.');
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('El email del administrador es obligatorio.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = input.ttlSeconds ?? 300;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: AdminJwtPayload = {
    sub: normalizedEmail,
    email: normalizedEmail,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    role: 'ADMIN',
    iss: input.iss ?? EXPECTED_ISSUER,
    aud: input.aud ?? EXPECTED_AUDIENCE,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', normalizedSecret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Verifica la firma HS256, expiración y claims de un JWT administrativo.
 */
export function verifyAdminJwt(
  token: string,
  secret: string,
): AdminJwtPayload {
  const normalizedSecret = secret.trim();
  if (!normalizedSecret) {
    throw new Error('El secreto JWT del servidor no está configurado.');
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error('El formato del token JWT es inválido.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson<{ alg?: unknown; typ?: unknown }>(
    encodedHeader,
    'encabezado',
  );

  if (header.alg !== 'HS256') {
    throw new Error('Algoritmo JWT no soportado.');
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignatureBuf = createHmac('sha256', normalizedSecret)
    .update(signingInput)
    .digest();
  const actualSignatureBuf = Buffer.from(encodedSignature, 'base64url');

  if (
    expectedSignatureBuf.length !== actualSignatureBuf.length ||
    !timingSafeEqual(expectedSignatureBuf, actualSignatureBuf)
  ) {
    throw new Error('La firma del token JWT es inválida.');
  }

  const payload = decodeBase64UrlJson<Record<string, unknown>>(
    encodedPayload,
    'payload',
  );

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('El payload del token JWT es inválido.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    throw new Error('El token JWT debe incluir una fecha de expiración.');
  }

  if (nowSeconds >= payload.exp) {
    throw new Error('El token JWT ha expirado.');
  }

  if (
    payload.nbf !== undefined &&
    (typeof payload.nbf !== 'number' ||
      !Number.isFinite(payload.nbf) ||
      nowSeconds < payload.nbf)
  ) {
    throw new Error('El token JWT aún no es válido.');
  }

  if (payload.iss !== undefined && payload.iss !== EXPECTED_ISSUER) {
    throw new Error('Emisor (iss) del token JWT no autorizado.');
  }

  if (payload.aud !== undefined && payload.aud !== EXPECTED_AUDIENCE) {
    throw new Error('Audiencia (aud) del token JWT no autorizada.');
  }

  if (typeof payload.role !== 'string' || !payload.role.trim()) {
    throw new Error('El token JWT no especifica un rol válido.');
  }

  if (typeof payload.email !== 'string' || !payload.email.includes('@')) {
    throw new Error('El token JWT no contiene un email válido.');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();

  return {
    sub:
      typeof payload.sub === 'string' && payload.sub.trim()
        ? payload.sub.trim()
        : normalizedEmail,
    email: normalizedEmail,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    role: payload.role.trim(),
    iss: typeof payload.iss === 'string' ? payload.iss : undefined,
    aud: typeof payload.aud === 'string' ? payload.aud : undefined,
    iat: typeof payload.iat === 'number' ? payload.iat : nowSeconds,
    exp: payload.exp,
  };
}
