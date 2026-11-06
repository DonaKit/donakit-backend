import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { RequirementService } from './requirement.service.js';

@Controller('requirements')
export class RequirementController {
  constructor(private readonly requirementService: RequirementService) {}

  /**
   * Endpoint público para listar requisitos de donación (US-12).
   * Permite filtrar por inhabilitaciones inmediatas (?immediateOnly=true),
   * por categoría (?category=GENERAL, HABITOS, SALUD)
   * y opcionalmente por centro de salud (?institutionId=...).
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('category') category?: string,
    @Query('immediateOnly') immediateOnly?: string,
    @Query('institutionId') institutionId?: string,
  ) {
    const isImmediate =
      immediateOnly !== undefined
        ? immediateOnly === 'true' || immediateOnly === '1'
        : undefined;

    const requirements = await this.requirementService.findAll(
      category,
      isImmediate,
      institutionId,
    );
    return {
      success: true,
      message: 'Requisitos de donación obtenidos exitosamente.',
      data: requirements,
    };
  }
}

