import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log(
    '--- Verificando y poblando Requisitos y FAQs para Landing Page ---',
  );

  // 1. Requisitos adicionales de salud
  const existingReqFiebre = await prisma.requirement.findFirst({
    where: { title: { contains: 'Fiebre' } },
  });

  if (!existingReqFiebre) {
    await prisma.requirement.create({
      data: {
        title: 'Estado de salud y fiebre',
        description:
          'Estar en buen estado general de salud. No haber tenido fiebre, dolor de garganta ni síntomas gripales en los últimos 7 a 14 días.',
        is_immediate_disqualification: true,
        category: 'SALUD',
        display_order: 6,
      },
    });
    console.log('✅ Creado requisito: Estado de salud y fiebre');
  }

  const existingReqCirugias = await prisma.requirement.findFirst({
    where: { title: { contains: 'Cirugías' } },
  });

  if (!existingReqCirugias) {
    await prisma.requirement.create({
      data: {
        title: 'Cirugías o intervenciones recientes',
        description:
          'Haber transcurrido al menos 6 meses tras cirugías mayores o procedimientos como endoscopías o colonoscopías.',
        is_immediate_disqualification: true,
        category: 'SALUD',
        display_order: 7,
      },
    });
    console.log('✅ Creado requisito: Cirugías o intervenciones recientes');
  }

  // 2. FAQs adicionales para US13 (intervenciones recientes, estilo de vida)
  const existingFaqCirugias = await prisma.faq_item.findFirst({
    where: { category: 'INTERVENCIONES' },
  });

  if (!existingFaqCirugias) {
    await prisma.faq_item.create({
      data: {
        question:
          '¿Puedo donar si me operé o me hice una endoscopía recientemente?',
        answer:
          'Debes esperar al menos 6 meses posteriores a cualquier cirugía mayor o estudio endoscópico para asegurar una recuperación completa.',
        category: 'INTERVENCIONES',
        display_order: 4,
      },
    });
    console.log('✅ Creada FAQ: Intervenciones recientes');
  }

  const existingFaqEstilo = await prisma.faq_item.findFirst({
    where: { category: 'ESTILO_DE_VIDA' },
  });

  if (!existingFaqEstilo) {
    await prisma.faq_item.create({
      data: {
        question: '¿Puedo donar si fumo o consumo alcohol?',
        answer:
          'Se recomienda no fumar 2 horas antes ni 2 horas después de la donación. No haber consumido bebidas alcohólicas en las últimas 12 horas.',
        category: 'ESTILO_DE_VIDA',
        display_order: 5,
      },
    });
    console.log('✅ Creada FAQ: Estilo de vida');
  }

  console.log('--- Proceso de inicialización completado ---');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Error al inicializar seed:', err);
  process.exit(1);
});
