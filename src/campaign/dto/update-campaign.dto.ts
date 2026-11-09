import type { campaign_status } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { VALID_BLOOD_TYPES } from './create-campaign.dto.js';

export class UpdateCampaignDto {
  /**
   * Token secreto de edición asignado al crear el pedido.
   * Obligatorio para autorizar cualquier modificación (US-09).
   */
  @Transform(({ obj, value }) =>
    typeof value === 'string' ? value.trim() : obj?.edit_token?.trim(),
  )
  @IsNotEmpty({
    message:
      'El editToken es requerido para autorizar la modificación del pedido.',
  })
  @IsString({ message: 'El editToken debe ser una cadena de texto válida.' })
  editToken!: string;

  /**
   * Nombre completo del paciente receptor de la donación.
   * Opcional. Si se provee, no puede ser vacío ni contener números.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.patient_name;
    return typeof val === 'string' ? val.trim() : val;
  })
  @ValidateIf((_obj, val) => val !== undefined)
  @IsNotEmpty({ message: 'El nombre del paciente no puede estar vacío.' })
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
   * Identificador único (UUID) del centro de salud o institución receptora.
   * Opcional. Si se provee, no puede ser vacío y debe ser un UUID v4.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.institution_id;
    return typeof val === 'string' ? val.trim() : val;
  })
  @ValidateIf((_obj, val) => val !== undefined)
  @IsNotEmpty({ message: 'El centro de salud no puede estar vacío.' })
  @IsUUID('4', { message: 'El centro de salud debe ser un UUID v4 válido.' })
  institutionId?: string;

  /**
   * Grupo sanguíneo y factor Rh requerido (ej. "0+", "A+", "B-", "TODOS").
   * Opcional. Si se provee, debe ser uno de los formatos admitidos.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.blood_type;
    return typeof val === 'string' ? val.trim().toUpperCase() : val;
  })
  @ValidateIf((_obj, val) => val !== undefined)
  @IsNotEmpty({ message: 'El grupo sanguíneo no puede estar vacío.' })
  @IsString({ message: 'El grupo sanguíneo debe ser un texto válido.' })
  @IsIn(VALID_BLOOD_TYPES, {
    message:
      'El grupo sanguíneo debe ser uno de los formatos válidos: A+, A-, B+, B-, AB+, AB-, 0+, 0-, O+, O- o TODOS.',
  })
  bloodType?: string;

  /**
   * Tipo de donación solicitada (ej. "Sangre entera", "Plaquetas", "Plasma").
   * Opcional. Permite enviar null o "" para limpiar/borrar el valor en la base de datos.
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
   * Cantidad objetivo de donantes requeridos.
   * Opcional. Permite enviar null o "" para limpiar/borrar el valor en la base de datos.
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
  @Max(1000, { message: 'La cantidad de donantes no puede exceder los 1000.' })
  targetDonors?: number | null;

  /**
   * Fecha límite para la donación (formato ISO 8601 o YYYY-MM-DD).
   * Opcional. Permite enviar null o "" para limpiar/borrar el valor en la base de datos.
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
   * Observaciones o indicaciones adicionales para los donantes.
   * Opcional. Permite enviar null o "" para limpiar/borrar el valor en la base de datos.
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

  /**
   * Texto publicitario generado automáticamente para redes sociales (copy).
   * Opcional. Permite enviar null o "" para limpiar/borrar el valor en la base de datos.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.generated_copy;
    if (val === undefined) return undefined;
    if (val === null || (typeof val === 'string' && val.trim() === ''))
      return null;
    return typeof val === 'string' ? val.trim() : val;
  })
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsString({
    message: 'El texto generado (copy) debe ser una cadena de texto.',
  })
  @MaxLength(2000, {
    message: 'El texto generado (copy) no puede exceder los 2000 caracteres.',
  })
  generatedCopy?: string | null;

  /**
   * Estado del pedido de donación (US-16).
   * Opcional. Permite marcar la campaña como completada ("COMPLETED") una vez cubierta la necesidad,
   * reactivarla ("ACTIVE") o cancelarla ("CANCELLED").
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.status;
    return typeof val === 'string' ? val.trim().toUpperCase() : val;
  })
  @ValidateIf((_obj, val) => val !== undefined)
  @IsIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'DRAFT'], {
    message:
      'El estado debe ser uno de los permitidos: ACTIVE, COMPLETED, EXPIRED, CANCELLED o DRAFT.',
  })
  status?: campaign_status;

  /**
   * Cantidad actual de donantes conseguidos hasta la fecha (US-16, US-20).
   * Opcional. Permite actualizar el avance hacia la meta requerida.
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.current_donors;
    if (val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  })
  @ValidateIf((_obj, val) => val !== undefined)
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
}
