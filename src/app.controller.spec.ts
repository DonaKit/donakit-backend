import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './database/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { db: 'postgres', version: 'PostgreSQL 17.11', now: new Date() },
        ]),
      institution: { count: vi.fn().mockResolvedValue(1) },
      campaign: { count: vi.fn().mockResolvedValue(0) },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
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
