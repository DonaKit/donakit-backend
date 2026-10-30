import { createHash } from 'node:crypto';

/**
 * Calcula el hash criptográfico SHA-256 de un buffer.
 */
export function calculateHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Anonimiza la dirección IP del cliente aplicando SHA-256.
 * Retorna null si no se proporciona IP.
 */
export function hashIp(ip?: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip.trim()).digest('hex');
}

