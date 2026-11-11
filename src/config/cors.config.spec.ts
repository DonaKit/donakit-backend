import { describe, expect, it, vi } from 'vitest';
import {
  buildCorsOptions,
  isOriginAllowed,
  parseAllowedOrigins,
} from './cors.config.js';

describe('cors.config', () => {
  it('debe parsear múltiples orígenes de FRONTEND_URL eliminando espacios, comillas y barras finales', () => {
    const parsed = parseAllowedOrigins(
      ' "https://mi-front.vercel.app/" , http://localhost:3001/ ',
    );

    expect(parsed.exactOrigins.has('https://mi-front.vercel.app')).toBe(true);
    expect(parsed.exactOrigins.has('http://localhost:3001')).toBe(true);
    expect(parsed.vercelPreviewPatterns).toHaveLength(1);
  });

  it('debe permitir orígenes exactamente configurados en FRONTEND_URL', () => {
    const allowed = parseAllowedOrigins(
      'https://mi-front.vercel.app,http://localhost:3001',
    );

    expect(isOriginAllowed('https://mi-front.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('https://mi-front.vercel.app/', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:3001', allowed)).toBe(true);
  });

  it('debe permitir previews oficiales de Vercel derivadas dinámicamente de FRONTEND_URL', () => {
    const allowed = parseAllowedOrigins('https://mi-front.vercel.app');

    expect(
      isOriginAllowed('https://mi-front-git-feat-us19-equipo.vercel.app', allowed),
    ).toBe(true);
    expect(
      isOriginAllowed('https://mi-front-a1b2c3d4.vercel.app', allowed),
    ).toBe(true);
    expect(
      isOriginAllowed('https://mi-front-9k2m4p1x7.vercel.app', allowed),
    ).toBe(true);
    expect(
      isOriginAllowed('https://mi-front-k9m2p4q1x-equipo.vercel.app', allowed),
    ).toBe(true);
    expect(
      isOriginAllowed('https://mi-front-evil.vercel.app', allowed),
    ).toBe(false);
    expect(
      isOriginAllowed('https://mi-front-fakeproject.vercel.app', allowed),
    ).toBe(false);
    expect(
      isOriginAllowed('https://mi-front.vercel.app.atacante.com', allowed),
    ).toBe(false);
    expect(
      isOriginAllowed('http://mi-front-git-main-equipo.vercel.app', allowed),
    ).toBe(false);
    expect(
      isOriginAllowed('https://otro-proyecto.vercel.app', allowed),
    ).toBe(false);
  });

  it('debe permitir peticiones sin cabecera Origin y rechazar orígenes no autorizados', () => {
    const allowed = parseAllowedOrigins('https://mi-front.vercel.app');

    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('https://atacante.com', allowed)).toBe(false);
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(false);
  });

  it('debe denegar cualquier origen de navegador cuando FRONTEND_URL está vacío', () => {
    const allowed = parseAllowedOrigins('');

    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('https://mi-front.vercel.app', allowed)).toBe(
      false,
    );
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(false);
  });

  it('buildCorsOptions debe invocar el callback sin error para orígenes permitidos y con Error para denegados', () => {
    const options = buildCorsOptions('https://mi-front.vercel.app');
    expect(typeof options.origin).toBe('function');

    const originFn = options.origin as (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => void;

    const okCb = vi.fn();
    originFn('https://mi-front.vercel.app', okCb);
    expect(okCb).toHaveBeenCalledWith(null, true);

    const failCb = vi.fn();
    originFn('https://no-autorizado.com', failCb);
    expect(failCb.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});

