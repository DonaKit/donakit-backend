import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { parseBase64Image } from './base64-image.util.js';

describe('parseBase64Image', () => {
  it('debe parsear correctamente un Data URL PNG', () => {
    const rawData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dataUrl = `data:image/png;base64,${rawData}`;

    const parsed = parseBase64Image(dataUrl);

    expect(parsed.contentType).toBe('image/png');
    expect(parsed.extension).toBe('png');
    expect(parsed.buffer.length).toBeGreaterThan(0);
  });

  it('debe parsear un Data URL JPEG', () => {
    const rawData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dataUrl = `data:image/jpeg;base64,${rawData}`;

    const parsed = parseBase64Image(dataUrl);

    expect(parsed.contentType).toBe('image/jpeg');
    expect(parsed.extension).toBe('jpg');
    expect(parsed.buffer.length).toBeGreaterThan(0);
  });

  it('debe asumir image/png si se envía Base64 puro sin prefijo data:', () => {
    const rawData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const parsed = parseBase64Image(rawData);

    expect(parsed.contentType).toBe('image/png');
    expect(parsed.extension).toBe('png');
    expect(parsed.buffer.length).toBeGreaterThan(0);
  });

  it('debe lanzar BadRequestException si el tipo de contenido no es permitido (ej. text/html o image/gif)', () => {
    const dataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    expect(() => parseBase64Image(dataUrl)).toThrow(BadRequestException);
  });

  it('debe lanzar BadRequestException si el string está vacío o no es válido', () => {
    expect(() => parseBase64Image('')).toThrow(BadRequestException);
    expect(() => parseBase64Image(null as any)).toThrow(BadRequestException);
  });
});

