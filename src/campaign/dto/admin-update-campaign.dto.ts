import type { campaign_status } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { VALID_BLOOD_TYPES } from './create-campaign.dto.js';

export class AdminUpdateCampaignDto {
  /**
   * Estado de la campaña (US-16, US-20).
   * Opcional. Permite al administrador cerrar la campaña marcándola como "COMPLETED" o "CANCELLED", o reactivarla ("ACTIVE").
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.status;
    return typeof val === 'string' ? val.trim().toUpperCase() : val;
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'DRAFT'], {
    message:
      'El estado debe ser uno de los permitidos: ACTIVE, COMPLETED, EXPIRED, CANCELLED o DRAFT.',
  })
  status?: campaign_status;

  /**
   * Cantidad absoluta de donantes conseguidos hasta la fecha (US-16, US-20).
   * Opcional. Fija directamente el contador de donantes al guardar.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.current_donors;
    if (val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  })
  @IsOptional()
  @IsInt({
    message: 'La cantidad actual de donantes debe ser un número entero.',
  })
  @Min(0, {
    message: 'La cantidad actual de donantes no puede ser negativa.',
  })
  @Max(1000, {
    message: 'La cantidad actual de donantes no puede exceder los 1000.',
  })
  currentDonors?: number;

  /**
   * Cantidad incremental de donantes a sumar al total actual (ej. 1 para botón "+1 Donante").
   * Opcional. Si se provee, se suma al valor actual de currentDonors.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.increment_donors;
    if (val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  })
  @IsOptional()
  @IsInt({
    message: 'El incremento de donantes debe ser un número entero.',
  })
  @Min(1, {
    message: 'El incremento de donantes debe ser al menos 1.',
  })
  @Max(100, {
    message: 'El incremento de donantes no puede exceder 100 en una sola operación.',
  })
  incrementDonors?: number;

  /**
   * Cantidad objetivo de donantes requeridos.
   * Opcional. Permite ajustar la meta si las necesidades clínicas varían.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.target_donors;
    if (val === undefined) return undefined;
    if (val === null || (typeof val === 'string' && val.trim() === ''))
      return null;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  })
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsInt({
    message: 'La cantidad de donantes requeridos debe ser un número entero.',
  })
  @Min(1, {
    message: 'La cantidad de donantes requeridos debe ser al menos 1.',
  })
  @Max(1000, {
    message: 'La cantidad de donantes no puede exceder los 1000.',
  })
  targetDonors?: number | null;

  /**
   * Nueva fecha límite para la donación (formato ISO 8601 o YYYY-MM-DD).
   * Opcional. Permite prorrogar o cancelar la fecha límite del pedido.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.deadline;
    if (val === undefined) return undefined;
    if (val === null || (typeof val === 'string' && val.trim() === ''))
      return null;
    return typeof val === 'string' ? val.trim() : val;
  })
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsString({
    message: 'La fecha límite debe ser una cadena con formato de fecha válido.',
  })
  deadline?: string | null;

  /**
   * Nombre completo del paciente receptor de la donación.
   * Opcional. Si se provee, no puede estar vacío ni contener números.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.patient_name;
    return typeof val === 'string' ? val.trim() : val;
  })
  @IsOptional()
  @IsString({ message: 'El nombre del paciente debe ser un texto válido.' })
  @MinLength(2, {
    message: 'El nombre del paciente debe contener al menos 2 caracteres.',
  })
  @MaxLength(255, {
    message: 'El nombre del paciente no puede superar los 255 caracteres.',
  })
  @Matches(/^(?=.*[\p{L}])[\p{L}\s'-]+$/u, {
    message:
      'El nombre del paciente solo debe contener letras, espacios o guiones (no se permiten números ni caracteres especiales).',
  })
  patientName?: string;

  /**
   * Grupo sanguíneo y factor Rh requerido (ej. "0+", "A+", "B-", "TODOS").
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.blood_type;
    return typeof val === 'string' ? val.trim().toUpperCase() : val;
  })
  @IsOptional()
  @IsString({ message: 'El grupo sanguíneo debe ser un texto válido.' })
  @IsIn(VALID_BLOOD_TYPES, {
    message:
      'El grupo sanguíneo debe ser uno de los formatos válidos: A+, A-, B+, B-, AB+, AB-, 0+, 0-, O+, O- o TODOS.',
  })
  bloodType?: string;

  /**
   * Tipo de donación solicitada (ej. "Sangre entera", "Plaquetas", "Plasma").
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.donation_type;
    if (val === undefined) return undefined;
    if (val === null || (typeof val === 'string' && val.trim() === ''))
      return null;
    return typeof val === 'string' ? val.trim() : val;
  })
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsString({ message: 'El tipo de donación debe ser un texto válido.' })
  @MaxLength(50, {
    message: 'El tipo de donación no puede superar los 50 caracteres.',
  })
  donationType?: string | null;

  /**
   * Observaciones o indicaciones adicionales para los donantes.
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.observations;
    if (val === undefined) return undefined;
    if (val === null || (typeof val === 'string' && val.trim() === ''))
      return null;
    return typeof val === 'string' ? val.trim() : val;
  })
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsString({ message: 'Las observaciones deben ser una cadena de texto.' })
  @MaxLength(1000, {
    message: 'Las observaciones no pueden exceder los 1000 caracteres.',
  })
  observations?: string | null;
}
