import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { FaqService } from './faq.service.js';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * Endpoint público para listar preguntas frecuentes (US-13).
   * Permite filtrar por categoría médica (?category=TATUAJES, MEDICACION, HEPATITIS, etc.)
   * y opcionalmente por centro de salud (?institutionId=...).
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('category') category?: string,
    @Query('institutionId') institutionId?: string,
  ) {
    const faqs = await this.faqService.findAll(category, institutionId);
    return {
      success: true,
      message: 'Preguntas frecuentes obtenidas exitosamente.',
      data: faqs,
    };
  }
}
