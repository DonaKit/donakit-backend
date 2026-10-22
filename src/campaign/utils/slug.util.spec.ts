import { describe, it, expect } from 'vitest';
import { generateCampaignSlug, slugifyText } from './slug.util.js';

describe('slug.util', () => {
  describe('slugifyText', () => {
    it('debe normalizar tildes, caracteres especiales y mayúsculas en español', () => {
      const input = 'Martín Peña / Güiraldes (San Miguel)';
      const output = slugifyText(input);
      expect(output).toBe('martin-pena-guiraldes-san-miguel');
    });

    it('debe manejar cadenas vacías o espacios', () => {
      expect(slugifyText('')).toBe('');
      expect(slugifyText('    ')).toBe('');
    });
  });

  describe('generateCampaignSlug', () => {
    it('debe generar un slug con prefijo "donantes", nombre normalizado y sufijo único', () => {
      const slug = generateCampaignSlug('María José Álvarez');
      expect(slug).toMatch(/^donantes-maria-jose-alvarez-[a-f0-9]{6}$/);
    });

    it('debe generar dos slugs diferentes para el mismo nombre', () => {
      const slug1 = generateCampaignSlug('Juan Pérez');
      const slug2 = generateCampaignSlug('Juan Pérez');
      expect(slug1).not.toBe(slug2);
    });

    it('no debe exceder los 100 caracteres bajo ninguna circunstancia', () => {
      const longName = 'A'.repeat(200);
      const slug = generateCampaignSlug(longName);
      expect(slug.length).toBeLessThanOrEqual(100);
    });
  });
});
