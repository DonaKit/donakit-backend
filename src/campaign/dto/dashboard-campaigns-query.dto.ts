import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardCampaignsQueryDto {
  /**
   * Filtro por estado de campaña (ACTIVE, COMPLETED, EXPIRED, CANCELLED, DRAFT, ALL).
   * Por defecto 'ACTIVE'.
   */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'DRAFT', 'ALL'], {
    message:
      'El estado debe ser uno de los permitidos: ACTIVE, COMPLETED, EXPIRED, CANCELLED, DRAFT o ALL.',
  })
  status?: string = 'ACTIVE';

  /**
   * Número de página (1-based index).
   * Por defecto 1.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser al menos 1.' })
  page?: number = 1;

  /**
   * Cantidad máxima de campañas por página.
   * Por defecto 30, máximo 100.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite por página debe ser un número entero.' })
  @Min(1, { message: 'El límite por página debe ser al menos 1.' })
  @Max(100, { message: 'El límite por página no puede superar 100.' })
  limit?: number = 30;
}
