import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import type { InstitutionItemDto } from './dto/institution-item.dto.js';
import { InstitutionService } from './institution.service.js';

@Controller('institutions')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  /**
   * Endpoint para listar centros de salud activos acotados para selección en combobox.
   * Devuelve directamente el listado (array) de instituciones sin envoltorios redundantes.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<InstitutionItemDto[]> {
    return this.institutionService.findAll();
  }
}
