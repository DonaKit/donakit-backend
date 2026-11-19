import { randomBytes } from 'node:crypto';

/**
 * Normaliza y convierte un texto a formato slug (URL-friendly),
 * eliminando tildes, caracteres especiales y reemplazando espacios por guiones.
 */
export function slugifyText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD') // Separa caracteres base de sus diacríticos (acentos)
    .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Reemplaza cualquier carácter no alfanumérico por un guion
    .replace(/^-+|-+$/g, '') // Elimina guiones iniciales o finales
    .replace(/-{2,}/g, '-'); // Reemplaza múltiples guiones seguidos por uno solo
}

/**
 * Genera un slug único para una campaña de donación a partir del nombre del paciente
 * y un sufijo aleatorio seguro, garantizando que sea menor al límite de 100 caracteres.
 *
 * Ejemplo: "María Belén Gómez" -> "donantes-maria-belen-gomez-4a9f2e"
 */
export function generateCampaignSlug(
  patientName: string,
  suffixLength = 6,
): string {
  const basePrefix = 'donantes';
  const cleanName = slugifyText(patientName).slice(0, 50); // Límite seguro para el nombre
  const randomSuffix = randomBytes(Math.ceil(suffixLength / 2))
    .toString('hex')
    .slice(0, suffixLength);

  const parts = [basePrefix];
  if (cleanName) {
    parts.push(cleanName);
  }
  parts.push(randomSuffix);

  return parts.join('-').slice(0, 100);
}
