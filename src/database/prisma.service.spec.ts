import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService (Supabase Integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('debe conectarse a Supabase y consultar instituciones existentes', async () => {
    const institutions = await prisma.institution.findMany();
    expect(Array.isArray(institutions)).toBe(true);
    expect(institutions.length).toBeGreaterThan(0);
    console.log(` Conexión validada: Se encontraron ${institutions.length} instituciones en Supabase.`);
  });
});
