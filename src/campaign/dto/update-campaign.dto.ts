import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
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
    message: 'El editToken es requerido para autorizar la modificación del pedido.',
  })
  @IsString({ message: 'El editToken debe ser una cadena de texto válida.' })
  editToken!: string;

  /**
   * Nombre completo del paciente receptor de la donación.
   * Opcional. Si se provee, debe ser válido (solo letras, espacios, guiones o apóstrofes; sin números).
   */
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.patient_name;
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
   * Identificador único (UUID) del centro de salud o institución receptora.
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.institution_id;
    return typeof val === 'string' ? val.trim() : val;
  })
  @IsOptional()
  @IsUUID('4', { message: 'El centro de salud debe ser un UUID v4 válido.' })
  institutionId?: string;

  /**
   * Grupo sanguíneo y factor Rh requerido (ej. "0+", "A+", "B-", "TODOS").
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.blood_type;
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
    const val = value ?? obj?.donation_type;
    if (val === '' || val === null) return undefined;
    return typeof val === 'string' ? val.trim() : val;
  })
  @IsOptional()
  @IsString({ message: 'El tipo de donación debe ser un texto válido.' })
  @MaxLength(50, {
    message: 'El tipo de donación no puede superar los 50 caracteres.',
  })
  donationType?: string;

  /**
   * Cantidad objetivo de donantes requeridos.
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.target_donors;
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  })
  @IsOptional()
  @IsInt({
    message: 'La cantidad de donantes requeridos debe ser un número entero.',
  })
  @Min(1, {
    message: 'La cantidad de donantes requeridos debe ser al menos 1.',
  })
  @Max(1000, { message: 'La cantidad de donantes no puede exceder los 1000.' })
  targetDonors?: number;

  /**
   * Fecha límite para la donación (formato ISO 8601 o YYYY-MM-DD).
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.deadline;
    return val === '' || val === null ? undefined : val;
  })
  @IsOptional()
  @IsString({
    message: 'La fecha límite debe ser una cadena con formato de fecha válido.',
  })
  deadline?: string;

  /**
   * Observaciones o indicaciones adicionales para los donantes.
   * Opcional.
   */
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.observations;
    if (val === '' || val === null) return undefined;
    return typeof val === 'string' ? val.trim() : val;
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser una cadena de texto.' })
  @MaxLength(1000, {
    message: 'Las observaciones no pueden exceder los 1000 caracteres.',
  })
  observations?: string;
}

