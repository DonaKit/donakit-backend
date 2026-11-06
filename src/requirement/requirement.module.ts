import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RequirementController } from './requirement.controller.js';
import { RequirementService } from './requirement.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RequirementController],
  providers: [RequirementService],
  exports: [RequirementService],
})
export class RequirementModule {}

