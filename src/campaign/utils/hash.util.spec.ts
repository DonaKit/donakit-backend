import { describe, expect, it } from 'vitest';
import { calculateHash, hashIp } from './hash.util.js';

describe('hash.util', () => {
  it('calculateHash debe retornar el hash SHA-256 consistente de un buffer', () => {
    const buffer1 = Buffer.from('test-content');
    const buffer2 = Buffer.from('test-content');
    const buffer3 = Buffer.from('different-content');

    expect(calculateHash(buffer1)).toBe(calculateHash(buffer2));
    expect(calculateHash(buffer1)).not.toBe(calculateHash(buffer3));
  });

  it('hashIp debe retornar hash para IPs válidas y null si es undefined/vacío', () => {
    expect(hashIp('192.168.1.1')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashIp(undefined)).toBeNull();
    expect(hashIp(null)).toBeNull();
    expect(hashIp('')).toBeNull();
  });
});

