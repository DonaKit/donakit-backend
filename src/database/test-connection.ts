import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('\n======================================================');
  console.log('🔍 INICIANDO DIAGNÓSTICO DE CONEXIÓN A SUPABASE');
  console.log('======================================================\n');

  const start = performance.now();

  try {
    // 1. Probar conexión básica y latencia
    await prisma.$connect();
    const pingLatency = Math.round(performance.now() - start);
    console.log(`✅ Estado de Conexión : CONECTADO EXITOSAMENTE`);
    console.log(`⏱️  Latencia de Ping   : ${pingLatency} ms`);

    // 2. Información del motor PostgreSQL
    const rawResult: Array<{
      db_name: string;
      pg_version: string;
      server_time: Date;
    }> =
      await prisma.$queryRaw`SELECT current_database() as db_name, version() as pg_version, now() as server_time`;

    if (rawResult.length > 0) {
      console.log(`📦 Base de Datos      : ${rawResult[0].db_name}`);
      console.log(
        `🕒 Hora del Servidor  : ${rawResult[0].server_time.toISOString()}`,
      );
      console.log(
        `🐘 Versión Postgres   : ${rawResult[0].pg_version.split(',')[0]}`,
      );
    }

    console.log('\n------------------------------------------------------');
    console.log('📊 CONTEO DE TABLAS REALES EN SUPABASE');
    console.log('------------------------------------------------------');

    const [institutionsCount, campaignsCount, faqsCount, requirementsCount] =
      await Promise.all([
        prisma.institution.count(),
        prisma.campaign.count(),
        prisma.faq_item.count(),
        prisma.requirement.count(),
      ]);

    console.table([
      { Tabla: 'institution', 'Registros Existentes': institutionsCount },
      { Tabla: 'campaign', 'Registros Existentes': campaignsCount },
      { Tabla: 'faq_item', 'Registros Existentes': faqsCount },
      { Tabla: 'requirement', 'Registros Existentes': requirementsCount },
    ]);

    // 3. MOCK QUERY: Lectura de datos reales
    console.log('------------------------------------------------------');
    console.log('📋 MOCK QUERY: Lectura de Institución y Requisitos');
    console.log('------------------------------------------------------');

    const sampleInstitution = await prisma.institution.findFirst({
      include: {
        requirement: { take: 3 },
      },
    });

    if (sampleInstitution) {
      console.log('\n🏥 Institución Encontrada:');
      console.log({
        id: sampleInstitution.id,
        nombre: sampleInstitution.name,
        direccion: sampleInstitution.address,
        ciudad: sampleInstitution.city,
        horarios: sampleInstitution.business_hours,
        requisitosCargados: sampleInstitution.requirement.map(
          (r) => `• ${r.title}`,
        ),
      });
    }

    // 4. MOCK QUERY: Prueba de Escritura y Eliminación (Ciclo CRUD completo)
    console.log('\n------------------------------------------------------');
    console.log('🧪 MOCK QUERY: Prueba de Escritura Transaccional (CRUD)');
    console.log('------------------------------------------------------');

    if (sampleInstitution) {
      const mockSlug = `test-mock-${Date.now()}`;
      const mockCampaign = await prisma.campaign.create({
        data: {
          slug: mockSlug,
          edit_token: 'token-prueba-123',
          patient_name: 'Paciente Mock Prueba',
          blood_type: '0+',
          target_donors: 5,
          current_donors: 0,
          institution_id: sampleInstitution.id,
        },
      });

      console.log('✅ Inserción Mock exitosa:');
      console.log({
        id: mockCampaign.id,
        slug: mockCampaign.slug,
        paciente: mockCampaign.patient_name,
        grupoSanguineo: mockCampaign.blood_type,
        creadoEn: mockCampaign.created_at,
      });

      // Limpieza inmediata del registro mock
      await prisma.campaign.delete({
        where: { id: mockCampaign.id },
      });
      console.log(
        '🧹 Limpieza completada: Registro mock eliminado correctamente.',
      );
    }

    console.log('\n======================================================');
    console.log(
      '🎉 RESULTADO FINAL: Conexión, lectura y escritura 100% operativas',
    );
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Error durante la prueba de conexión:', error);
  } finally {
    await prisma.$disconnect();
  }
}

void runTest();
