import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

export interface ParsedAllowedOrigins {
  exactOrigins: Set<string>;
  vercelPreviewPatterns: RegExp[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeOrigin(rawOrigin: string): string {
  const cleaned = rawOrigin
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');
  if (!cleaned) {
    return '';
  }

  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
}

/**
 * Parsea la variable de entorno `FRONTEND_URL` (lista separada por comas)
 * sin depender de orígenes hardcodeados en el código fuente.
 * Si alguno de los orígenes configurados pertenece a `https://<proyecto>.vercel.app`,
 * habilita automáticamente sus subdominios oficiales de preview en Vercel.
 */
export function parseAllowedOrigins(
  rawFrontendUrls = '',
): ParsedAllowedOrigins {
  const exactOrigins = new Set<string>();
  const vercelProjects = new Set<string>();

  for (const entry of rawFrontendUrls.split(',')) {
    const normalized = normalizeOrigin(entry);
    if (!normalized) {
      continue;
    }

    exactOrigins.add(normalized);

    try {
      const parsed = new URL(normalized);
      if (
        parsed.protocol === 'https:' &&
        parsed.hostname.endsWith('.vercel.app')
      ) {
        const projectSlug = parsed.hostname.slice(0, -'.vercel.app'.length);
        const isAlreadyPreviewSlug =
          /-(git-[a-z0-9_-]+|[0-9a-f]{7,40}(-[a-z0-9_-]+)?|(?=[a-z0-9]*[0-9])[a-z0-9]{7,16}(-[a-z0-9_-]+)?)$/i.test(
            projectSlug,
          );

        if (projectSlug && !isAlreadyPreviewSlug) {
          vercelProjects.add(projectSlug);
        }
      }
    } catch {
      // Si el valor no es una URL estándar, se conserva únicamente la comparación exacta
    }
  }

  const vercelPreviewPatterns = Array.from(vercelProjects).map(
    (slug) =>
      new RegExp(
        `^https://${escapeRegExp(slug)}-(git-[a-z0-9-]+|[0-9a-f]{7,40}(-[a-z0-9-]+)?|(?=[a-z0-9]*[0-9])[a-z0-9]{7,16}(-[a-z0-9-]+)?|[a-z0-9]{9}-[a-z0-9-]+)\\.vercel\\.app$`,
        'i',
      ),
  );

  return { exactOrigins, vercelPreviewPatterns };
}

/**
 * Verifica si el `Origin` de una petición entrante está autorizado según `FRONTEND_URL`.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowed: ParsedAllowedOrigins,
): boolean {
  // Peticiones sin cabecera Origin (curl, Postman, llamadas server-to-server o Render health checks)
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return false;
  }

  if (allowed.exactOrigins.has(normalized)) {
    return true;
  }

  return allowed.vercelPreviewPatterns.some((pattern) =>
    pattern.test(normalized),
  );
}

/**
 * Construye las opciones de CORS para NestJS leyendo los orígenes desde `FRONTEND_URL`.
 */
export function buildCorsOptions(rawFrontendUrls?: string): CorsOptions {
  const allowed = parseAllowedOrigins(rawFrontendUrls);

  return {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowed)) {
        return callback(null, true);
      }

      callback(
        new Error(
          `Acceso denegado por política CORS para el origen: ${origin}`,
        ),
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}

