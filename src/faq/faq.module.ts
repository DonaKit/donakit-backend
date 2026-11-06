import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { FaqController } from './faq.controller.js';
import { FaqService } from './faq.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FaqController],
  providers: [FaqService],
  exports: [FaqService],
})
export class FaqModule {}

