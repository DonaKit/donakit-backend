import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'DonaKit API Online';
  }

  async getHealth() {
    const start = performance.now();
    const [raw] = await this.prisma.$queryRaw<Array<{ db: string; version: string; now: Date }>>`
      SELECT current_database() as db, version() as version, now() as now
    `;
    const latencyMs = Math.round(performance.now() - start);

    const [institutions, campaigns] = await Promise.all([
      this.prisma.institution.count(),
      this.prisma.campaign.count(),
    ]);

    return {
      status: 'ok',
      service: 'donakit-backend',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        engine: 'PostgreSQL (Supabase)',
        name: raw?.db ?? 'postgres',
        serverTime: raw?.now,
        latencyMs: `${latencyMs}ms`,
        counts: {
          institutions,
          campaigns,
        },
      },
    };
  }
}
