import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CampaignModule } from './campaign/campaign.module.js';
import { SnakeToCamelMiddleware } from './common/middleware/snake-to-camel.middleware.js';
import { DatabaseModule } from './database/database.module.js';
import { FaqModule } from './faq/faq.module.js';
import { InstitutionModule } from './institution/institution.module.js';
import { RequirementModule } from './requirement/requirement.module.js';

@Module({
  imports: [
    DatabaseModule,
    CampaignModule,
    InstitutionModule,
    FaqModule,
    RequirementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SnakeToCamelMiddleware).forRoutes('*');
  }
}
