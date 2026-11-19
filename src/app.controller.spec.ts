import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import type { PrismaService } from './database/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    const mockPrismaService = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { db: 'postgres', version: 'PostgreSQL 17.11', now: new Date() },
        ]),
      institution: { count: vi.fn().mockResolvedValue(1) },
      campaign: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as PrismaService;

    const appService = new AppService(mockPrismaService);
    appController = new AppController(appService);
  });

  describe('root', () => {
    it('should return API status message', () => {
      expect(appController.getHello()).toBe('DonaKit API Online');
    });

    it('should return streamlined health status { status: "ok" }', async () => {
      const health = await appController.getHealth();
      expect(health).toEqual({ status: 'ok' });
    });
  });
});
